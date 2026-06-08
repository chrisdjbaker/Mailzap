import { getValidToken } from "./chromeAuth";
import { fetchMessageIds } from "./fetchMessageIds";
import { gmailFetch } from "./gmailApi";

// Gmail's batchModify endpoint accepts up to 1000 message IDs per request.
const BATCH_MODIFY_LIMIT = 1000;

/**
 * Trashes emails from multiple senders.
 *
 * @param senders - An array of sender email addresses whose emails should be trashed.
 * @param accountEmail - The email address of the user wanting to trash the emails.
 * @param trashSenderFunc - (Optional) A function to trash emails from a single sender. Defaults to `trashSender`.
 * @returns The total number of emails trashed across all specified senders.
 */
export async function trashMultipleSenders(
  senders: string[],
  accountEmail: string,
  trashSenderFunc = trashSender,
) {
  let totalEmailsTrashed = 0;
  const token = await getValidToken(accountEmail);
  for (const sender of senders) {
    totalEmailsTrashed += await trashSenderFunc(token, sender);
  }
  return totalEmailsTrashed;
}

/**
 * Moves all emails from a specified sender to the Trash in the user's Gmail account.
 *
 * @param token - The OAuth 2.0 access token for authenticating with the Gmail API.
 * @param senderEmail - The email address of the sender whose messages should be trashed.
 * @returns A promise that resolves to the number of emails moved to Trash.
 *
 * @remarks
 * Uses Gmail's `batchModify` endpoint to add the `TRASH` label to up to 1000
 * messages per request, instead of issuing one request per message. For a
 * sender with thousands of emails this turns hundreds of round-trips into a
 * handful, and is far less likely to trip rate limits.
 */
async function trashSender(
  token: chrome.identity.GetAuthTokenResult,
  senderEmail: string,
): Promise<number> {
  const messageIds = await fetchMessageIds(token, senderEmail);
  if (messageIds.length === 0) return 0; // No emails to trash

  for (let i = 0; i < messageIds.length; i += BATCH_MODIFY_LIMIT) {
    const batch = messageIds.slice(i, i + BATCH_MODIFY_LIMIT);
    await gmailFetch("/messages/batchModify", token, {
      method: "POST",
      body: JSON.stringify({
        ids: batch,
        addLabelIds: ["TRASH"],
        removeLabelIds: ["INBOX"],
      }),
    });
  }

  console.log(`Trashed ${messageIds.length} emails from ${senderEmail}`);
  return messageIds.length; // Return the number of emails trashed
}

export const exportForTest = { trashSender };
