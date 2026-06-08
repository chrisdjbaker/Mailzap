import { Sender } from "../types/types";

/**
 * A stored sender row. Index meanings:
 *   0: sender email
 *   1: display name (shortest seen)
 *   2: message count
 *   3: latest message id (used for unsubscribe / preview)
 *   4: total size in bytes
 *
 * Size was appended after the original 4-tuple, so older stored rows may be
 * length 4; readers must treat a missing size as 0.
 */
export type SenderTuple = [string, string, number, string, number];

/** Aggregated, in-memory view of a single sender during a scan/sync. */
export interface SenderAgg {
  names: Set<string>;
  count: number;
  latestMessageId: string;
  size: number;
}

interface StoredAccount {
  senders: SenderTuple[];
  /** Gmail history cursor for incremental sync. */
  historyId?: string;
}

/**
 * A message id → `[senderEmail, sizeBytes]` map, enabling accurate
 * decrement-on-delete during incremental sync.
 */
export type MessageIndex = Record<string, [string, number]>;

const indexKey = (account: string) => `mz_index_${account}`;
const lastTrashKey = (account: string) => `mz_lasttrash_${account}`;

/** Reads the stored account record (senders + history cursor). */
export async function readAccount(account: string): Promise<StoredAccount> {
  const result = await chrome.storage.local.get([account]);
  return (result[account] as StoredAccount) ?? { senders: [] };
}

/** Persists the account record. */
export async function writeAccount(
  account: string,
  data: StoredAccount,
): Promise<void> {
  await chrome.storage.local.set({ [account]: data });
}

/** Reads the message id → sender email index for an account. */
export async function readIndex(account: string): Promise<MessageIndex> {
  const key = indexKey(account);
  const result = await chrome.storage.local.get([key]);
  return (result[key] as MessageIndex) ?? {};
}

/** Persists the message id → sender email index for an account. */
export async function writeIndex(
  account: string,
  index: MessageIndex,
): Promise<void> {
  await chrome.storage.local.set({ [indexKey(account)]: index });
}

/** Records the message ids trashed in the most recent delete, for undo. */
export async function writeLastTrash(
  account: string,
  messageIds: string[],
): Promise<void> {
  await chrome.storage.local.set({ [lastTrashKey(account)]: messageIds });
}

/** Reads (and does not clear) the most recently trashed message ids. */
export async function readLastTrash(account: string): Promise<string[]> {
  const key = lastTrashKey(account);
  const result = await chrome.storage.local.get([key]);
  return (result[key] as string[]) ?? [];
}

/** Converts stored tuples into a keyed aggregation map for mutation. */
export function tuplesToAgg(tuples: SenderTuple[]): Record<string, SenderAgg> {
  const map: Record<string, SenderAgg> = {};
  for (const [email, name, count, latestMessageId, size] of tuples) {
    map[email] = {
      names: new Set([name]),
      count,
      latestMessageId,
      size: size ?? 0,
    };
  }
  return map;
}

/** Serialises an aggregation map back into stored tuples, sorted by count desc. */
export function aggToTuples(map: Record<string, SenderAgg>): SenderTuple[] {
  return Object.entries(map)
    .filter(([, agg]) => agg.count > 0)
    .map(([email, agg]): SenderTuple => {
      const name = Array.from(agg.names).sort((a, b) => a.length - b.length)[0];
      return [email, name, agg.count, agg.latestMessageId, agg.size];
    })
    .sort((a, b) => b[2] - a[2]);
}

/** Maps stored tuples to the UI `Sender` shape, filtering self/none senders. */
export function tuplesToSenders(tuples: SenderTuple[]): Sender[] {
  return tuples
    .filter(([email]) => email !== "null" && !email.endsWith("@gmail.com"))
    .map(([email, name, count, , size]) => ({
      email,
      name,
      count,
      size: size ?? 0,
    }));
}
