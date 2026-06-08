import { getValidToken } from "./chromeAuth";
import { gmailBatchGet, GMAIL_BATCH_LIMIT, gmailFetch } from "./gmailApi";
import { parseSender } from "./utils";
import { fetchAllSenders, addMessage } from "./fetchSenders";
import {
  readAccount,
  writeAccount,
  readIndex,
  writeIndex,
  tuplesToAgg,
  aggToTuples,
  SenderAgg,
  MessageIndex,
} from "./senderStore";

interface HistoryMessage {
  id: string;
}

interface HistoryRecord {
  messagesAdded?: { message: HistoryMessage }[];
  messagesDeleted?: { message: HistoryMessage }[];
}

interface HistoryResponse {
  history?: HistoryRecord[];
  historyId?: string;
  nextPageToken?: string;
}

interface GmailMessage {
  id?: string;
  sizeEstimate?: number;
  payload?: { headers?: { name: string; value: string }[] };
}

/**
 * Incrementally syncs stored sender data using Gmail's history API.
 *
 * If there is no stored history cursor (first run) or the cursor has expired
 * (Gmail returns 404 for history older than ~a week), this falls back to a
 * full {@link fetchAllSenders} scan. Otherwise it applies only the messages
 * added and deleted since the last sync, which is dramatically cheaper than a
 * full rescan.
 *
 * @param accountEmail - The account to sync.
 */
export async function syncSenders(accountEmail: string): Promise<void> {
  const stored = await readAccount(accountEmail);
  if (!stored.historyId || stored.senders.length === 0) {
    return fetchAllSenders(accountEmail);
  }

  const token = await getValidToken(accountEmail);

  let added: string[];
  let deleted: string[];
  let newHistoryId: string | undefined;
  try {
    ({ added, deleted, newHistoryId } = await collectHistory(
      token,
      stored.historyId,
    ));
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      // Cursor expired — Gmail can no longer tell us the delta. Full resync.
      console.warn("History cursor expired; performing a full resync.");
      return fetchAllSenders(accountEmail);
    }
    throw err;
  }

  if (added.length === 0 && deleted.length === 0) {
    if (newHistoryId) await writeAccount(accountEmail, { ...stored, historyId: newHistoryId });
    console.log("Incremental sync: nothing changed.");
    return;
  }

  const senders: Record<string, SenderAgg> = tuplesToAgg(stored.senders);
  const index: MessageIndex = await readIndex(accountEmail);

  // Apply deletions first using the stored index (id → [sender, size]).
  for (const id of deleted) {
    const entry = index[id];
    if (!entry) continue;
    const [email, size] = entry;
    const agg = senders[email];
    if (agg) {
      agg.count -= 1;
      agg.size = Math.max(0, agg.size - size);
    }
    delete index[id];
  }

  // Fetch metadata for newly added messages (skip any already indexed).
  const toFetch = added.filter((id) => !(id in index));
  for (let i = 0; i < toFetch.length; i += GMAIL_BATCH_LIMIT) {
    const batch = toFetch.slice(i, i + GMAIL_BATCH_LIMIT);
    const messages = await fetchAddedMetadata(token, batch);
    for (const msg of messages) {
      addMessage(senders, index, msg);
    }
  }

  await writeAccount(accountEmail, {
    senders: aggToTuples(senders),
    historyId: newHistoryId ?? stored.historyId,
  });
  await writeIndex(accountEmail, index);
  console.log(
    `Incremental sync: +${toFetch.length} added, -${deleted.length} deleted.`,
  );
}

/**
 * Walks the paginated history feed from `startHistoryId`, collecting added and
 * deleted message ids and the latest history cursor.
 */
async function collectHistory(
  token: chrome.identity.GetAuthTokenResult,
  startHistoryId: string,
): Promise<{ added: string[]; deleted: string[]; newHistoryId?: string }> {
  const added = new Set<string>();
  const deleted = new Set<string>();
  let pageToken: string | undefined;
  let newHistoryId: string | undefined;

  do {
    let path =
      `/history?startHistoryId=${encodeURIComponent(startHistoryId)}` +
      `&historyTypes=messageAdded&historyTypes=messageDeleted`;
    if (pageToken) path += `&pageToken=${encodeURIComponent(pageToken)}`;

    const data = await gmailFetch<HistoryResponse>(path, token);
    for (const record of data.history ?? []) {
      for (const m of record.messagesAdded ?? []) added.add(m.message.id);
      for (const m of record.messagesDeleted ?? []) deleted.add(m.message.id);
    }
    newHistoryId = data.historyId ?? newHistoryId;
    pageToken = data.nextPageToken;
  } while (pageToken);

  // A message added then deleted within the window nets to nothing.
  for (const id of deleted) added.delete(id);

  return { added: [...added], deleted: [...deleted], newHistoryId };
}

/** Fetches From + size metadata for a batch of added message ids. */
async function fetchAddedMetadata(
  token: chrome.identity.GetAuthTokenResult,
  messageIds: string[],
): Promise<
  { senderEmail: string; senderName: string; messageId: string; size: number }[]
> {
  const paths = messageIds.map(
    (id) => `/messages/${id}?format=metadata&metadataHeaders=From`,
  );
  const responses = await gmailBatchGet<GmailMessage>(paths, token);

  const result = [];
  for (let i = 0; i < responses.length; i++) {
    const msgData = responses[i];
    if (!msgData) continue;
    const sender = msgData.payload?.headers?.find(
      (h) => h.name === "From",
    )?.value;
    const [email, name] = parseSender(sender ?? null);
    result.push({
      senderEmail: email,
      senderName: name,
      messageId: msgData.id ?? messageIds[i],
      size: msgData.sizeEstimate ?? 0,
    });
  }
  return result;
}

export const exportForTest = { collectHistory };
