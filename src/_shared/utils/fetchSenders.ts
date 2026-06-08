import { getValidToken } from "./chromeAuth";
import { parseSender } from "./utils";
import { fetchMessageIds } from "./fetchMessageIds";
import { gmailBatchGet, GMAIL_BATCH_LIMIT, gmailFetch } from "./gmailApi";
import {
  SenderAgg,
  aggToTuples,
  writeAccount,
  writeIndex,
  MessageIndex,
} from "./senderStore";

interface MessageData {
  senderEmail: string;
  senderName: string;
  messageId: string;
  size: number;
}

interface GmailMessage {
  id?: string;
  sizeEstimate?: number;
  payload?: { headers?: { name: string; value: string }[] };
}

/**
 * Performs a full scan of a Gmail account: enumerates every message, groups
 * them by sender with per-sender counts and total size, records a message
 * id → sender index (for incremental sync), and stores the current Gmail
 * `historyId` so future refreshes can sync incrementally.
 *
 * @param accountEmail - The account to scan.
 */
export async function fetchAllSenders(accountEmail: string): Promise<void> {
  const authToken = await getValidToken(accountEmail);
  const senders: Record<string, SenderAgg> = {};
  const index: MessageIndex = {};

  try {
    // Capture the history cursor up front so we never miss mail that arrives
    // during the scan (we'd rather re-process a message than skip it).
    const startHistoryId = await getCurrentHistoryId(authToken);

    const allMessageIds = await fetchMessageIds(authToken);
    const total = allMessageIds.length;

    await setProgress(accountEmail, total === 0 ? 1 : 0);

    for (let i = 0; i < total; i += GMAIL_BATCH_LIMIT) {
      const batchIds = allMessageIds.slice(i, i + GMAIL_BATCH_LIMIT);
      const batchSenders = await fetchMessageSendersBatch(authToken, batchIds);
      for (const msg of batchSenders) {
        addMessage(senders, index, msg);
      }
      await setProgress(
        accountEmail,
        Math.min((i + batchIds.length) / total, 1),
      );
    }

    console.log(
      `Fetched ${total} emails. Found ${Object.keys(senders).length} unique senders.`,
    );

    await writeAccount(accountEmail, {
      senders: aggToTuples(senders),
      historyId: startHistoryId,
    });
    await writeIndex(accountEmail, index);
  } catch (err) {
    console.error("Error fetching senders:", err);
    throw err;
  } finally {
    await setProgress(accountEmail, 0);
  }
}

/**
 * Folds a single message into the sender aggregation map and the message index.
 */
export function addMessage(
  senders: Record<string, SenderAgg>,
  index: MessageIndex,
  msg: MessageData,
): void {
  index[msg.messageId] = [msg.senderEmail, msg.size];
  const existing = senders[msg.senderEmail];
  if (existing) {
    existing.count += 1;
    existing.size += msg.size;
    existing.names.add(msg.senderName);
  } else {
    senders[msg.senderEmail] = {
      count: 1,
      size: msg.size,
      names: new Set([msg.senderName]),
      latestMessageId: msg.messageId,
    };
  }
}

/** Returns the account's current Gmail history id via the profile endpoint. */
async function getCurrentHistoryId(
  token: chrome.identity.GetAuthTokenResult,
): Promise<string | undefined> {
  const profile = await gmailFetch<{ historyId?: string }>("/profile", token);
  return profile.historyId;
}

/**
 * Merges a progress fraction for one account into `fetchProgress`, preserving
 * any progress recorded for other accounts.
 */
async function setProgress(
  accountEmail: string,
  fraction: number,
): Promise<void> {
  const { fetchProgress = {} } =
    await chrome.storage.local.get("fetchProgress");
  await chrome.storage.local.set({
    fetchProgress: { ...fetchProgress, [accountEmail]: fraction },
  });
}

/**
 * Fetches sender + size information for a batch of message IDs in a single
 * multipart batch request.
 */
async function fetchMessageSendersBatch(
  token: chrome.identity.GetAuthTokenResult,
  messageIds: string[],
): Promise<MessageData[]> {
  const paths = messageIds.map(
    (id) => `/messages/${id}?format=metadata&metadataHeaders=From`,
  );
  const responses = await gmailBatchGet<GmailMessage>(paths, token);

  const result: MessageData[] = [];
  responses.forEach((msgData, i) => {
    if (!msgData) return; // Skip sub-requests that failed.
    const sender = msgData.payload?.headers?.find(
      (header) => header.name === "From",
    )?.value;
    const [email, name] = parseSender(sender ?? null);
    result.push({
      senderEmail: email,
      senderName: name,
      messageId: msgData.id ?? messageIds[i],
      size: msgData.sizeEstimate ?? 0,
    });
  });
  return result;
}

export const exportForTest = {
  fetchMessageSendersBatch,
  addMessage,
};
