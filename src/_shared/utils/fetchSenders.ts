import { getValidToken } from "./chromeAuth";
import { parseSender } from "./utils";
import { fetchMessageIds } from "./fetchMessageIds";
import { gmailBatchGet, GMAIL_BATCH_LIMIT } from "./gmailApi";

interface SenderData {
  name: Set<string>;
  count: number;
  latestMessageId: string;
}

interface MessageData {
  senderEmail: string;
  senderName: string;
  messageId: string;
}

interface GmailMessage {
  id?: string;
  payload?: { headers?: { name: string; value: string }[] };
}

/**
 * Fetches all unique email senders for a given Gmail account and counts their number of messages
 * The resulting sender data is stored for the specified account, in Chrome's local storage.
 *
 * @param accountEmail - The email address of the account for which senders are being fetched.
 * @returns A Promise that resolves when all senders have been fetched and stored.
 *
 * @remarks
 * - Progress is tracked under `fetchProgress[accountEmail]` in Chrome's local
 *   storage as a fraction between 0 and 1, merged so that progress for other
 *   accounts is preserved.
 * - Sender metadata is fetched using Gmail's batch endpoint
 *   ({@link gmailBatchGet}) to minimise round-trips.
 */
export async function fetchAllSenders(accountEmail: string): Promise<void> {
  const authToken = await getValidToken(accountEmail);
  const senders: { [key: string]: SenderData } = {};

  try {
    const allMessageIds = await fetchMessageIds(authToken);
    const total = allMessageIds.length;

    await setProgress(accountEmail, total === 0 ? 1 : 0);

    for (let i = 0; i < total; i += GMAIL_BATCH_LIMIT) {
      const batchIds = allMessageIds.slice(i, i + GMAIL_BATCH_LIMIT);
      const batchSenders = await fetchMessageSendersBatch(authToken, batchIds);
      updateSenders(batchSenders, senders);

      // Progress reflects how many messages have actually been processed.
      await setProgress(
        accountEmail,
        Math.min((i + batchIds.length) / total, 1),
      );
    }

    console.log(
      `Fetched ${total} emails. Found ${Object.keys(senders).length} unique senders.`,
    );

    storeSenders(senders, accountEmail);
  } catch (err) {
    console.error("Error fetching senders:", err);
    throw err;
  } finally {
    // Always clear progress so the UI doesn't get stuck on a stale value.
    await setProgress(accountEmail, 0);
  }
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
 * Fetches sender information for a batch of Gmail message IDs in a single
 * multipart batch request.
 *
 * @param token - The OAuth token used for authenticating Gmail API requests.
 * @param messageIds - Up to {@link GMAIL_BATCH_LIMIT} Gmail message IDs.
 * @returns A Promise resolving to the sender info for each successfully fetched message.
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
    });
  });
  return result;
}

/**
 * Updates the `allSenders` object with sender information from the provided list of messages.
 *
 * For each message in `messageList`, this function increments the sender's message count,
 * adds the sender's name to a set of names associated with the sender's email, and sets
 * the latest message ID if the sender is new.
 *
 * @param messageList - An array of message data objects containing sender information.
 * @param allSenders - An object mapping sender email addresses to their aggregated sender data.
 */
function updateSenders(
  messageList: MessageData[],
  allSenders: { [x: string]: SenderData },
): void {
  messageList.forEach((message) => {
    if (allSenders[message.senderEmail]) {
      allSenders[message.senderEmail].count += 1;
      allSenders[message.senderEmail]["name"].add(message.senderName);
    } else {
      allSenders[message.senderEmail] = {
        count: 1,
        name: new Set([message.senderName]),
        latestMessageId: message.messageId,
      };
    }
  });
}

/**
 * Stores a list of senders for a specific account in Chrome's local storage.
 *
 * @param senders - An object mapping sender email addresses to their corresponding SenderData.
 * @param accountEmail - The email address of the account to associate the stored senders with.
 */
function storeSenders(
  senders: { [s: string]: SenderData },
  accountEmail: string,
): void {
  const parsedSenders = Object.entries(senders)
    .map(([email, { name, count, latestMessageId }]) => [
      email,
      Array.from(name).sort((a, b) => a.length - b.length)[0], // Shortest name
      count,
      latestMessageId,
    ])
    .sort((a, b) => Number(b[2]) - Number(a[2])); // Sort by count in descending order

  chrome.storage.local.set({ [accountEmail]: { senders: parsedSenders } });
}

export const exportForTest = {
  fetchMessageSendersBatch,
  updateSenders,
  storeSenders,
};
