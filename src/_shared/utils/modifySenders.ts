import { getValidToken } from "./chromeAuth";
import { fetchMessageIds } from "./fetchMessageIds";
import { gmailFetch } from "./gmailApi";
import { writeLastTrash, readLastTrash } from "./senderStore";

// Gmail's batchModify endpoint accepts up to 1000 message IDs per request.
const BATCH_MODIFY_LIMIT = 1000;

interface LabelChange {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

/**
 * Applies a label change to every message id in `ids`, chunked into
 * batchModify requests of up to 1000 ids each.
 */
export async function batchModifyIds(
  token: chrome.identity.GetAuthTokenResult,
  ids: string[],
  labels: LabelChange,
): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_MODIFY_LIMIT) {
    const batch = ids.slice(i, i + BATCH_MODIFY_LIMIT);
    await gmailFetch("/messages/batchModify", token, {
      method: "POST",
      body: JSON.stringify({ ids: batch, ...labels }),
    });
  }
}

/**
 * Applies a label change to all messages from a single sender.
 *
 * @returns The ids of the affected messages.
 */
async function modifySender(
  token: chrome.identity.GetAuthTokenResult,
  senderEmail: string,
  labels: LabelChange,
): Promise<string[]> {
  const ids = await fetchMessageIds(token, senderEmail);
  if (ids.length === 0) return [];
  await batchModifyIds(token, ids, labels);
  return ids;
}

/**
 * Applies a label change to all messages from each of the given senders.
 *
 * @returns The combined ids of every affected message.
 */
async function modifyMultipleSenders(
  senders: string[],
  accountEmail: string,
  labels: LabelChange,
): Promise<string[]> {
  const token = await getValidToken(accountEmail);
  const allIds: string[] = [];
  for (const sender of senders) {
    allIds.push(...(await modifySender(token, sender, labels)));
  }
  return allIds;
}

/**
 * Moves all emails from the given senders to Trash, recording the affected ids
 * so the action can be undone.
 *
 * @returns The number of emails trashed.
 */
export async function trashMultipleSenders(
  senders: string[],
  accountEmail: string,
): Promise<number> {
  const ids = await modifyMultipleSenders(senders, accountEmail, {
    addLabelIds: ["TRASH"],
    removeLabelIds: ["INBOX"],
  });
  await writeLastTrash(accountEmail, ids);
  console.log(`Trashed ${ids.length} emails from ${senders.length} senders.`);
  return ids.length;
}

/**
 * Archives all emails from the given senders (removes them from the Inbox
 * without trashing).
 *
 * @returns The number of emails archived.
 */
export async function archiveMultipleSenders(
  senders: string[],
  accountEmail: string,
): Promise<number> {
  const ids = await modifyMultipleSenders(senders, accountEmail, {
    removeLabelIds: ["INBOX"],
  });
  console.log(`Archived ${ids.length} emails from ${senders.length} senders.`);
  return ids.length;
}

/**
 * Restores the most recently trashed batch of messages (removes `TRASH`,
 * restores `INBOX`). Recoverable because Gmail keeps trashed mail for ~30 days.
 *
 * @returns The number of emails restored.
 */
export async function undoLastTrash(accountEmail: string): Promise<number> {
  const ids = await readLastTrash(accountEmail);
  if (ids.length === 0) return 0;
  const token = await getValidToken(accountEmail);
  await batchModifyIds(token, ids, {
    addLabelIds: ["INBOX"],
    removeLabelIds: ["TRASH"],
  });
  await writeLastTrash(accountEmail, []); // Consume the undo buffer.
  console.log(`Restored ${ids.length} emails from Trash.`);
  return ids.length;
}

export const exportForTest = { modifySender, modifyMultipleSenders };
