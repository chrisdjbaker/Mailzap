import { getValidToken } from "./chromeAuth";
import { gmailFetch, gmailBatchGet } from "./gmailApi";
import { MessagePreview } from "../types/types";

interface GmailMessage {
  id?: string;
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
}

/**
 * Fetches a short preview of a sender's most recent messages (subject, date,
 * snippet) so users can sanity-check a sender before bulk-acting on it.
 *
 * @param accountEmail - The account to query.
 * @param senderEmail - The sender whose recent mail to preview.
 * @param limit - Maximum number of messages to return (default 10).
 * @returns The most recent messages from that sender.
 */
export async function getSenderPreview(
  accountEmail: string,
  senderEmail: string,
  limit = 10,
): Promise<MessagePreview[]> {
  const token = await getValidToken(accountEmail);

  const list = await gmailFetch<{ messages?: { id: string }[] }>(
    `/messages?maxResults=${limit}&q=from:${encodeURIComponent(senderEmail)}`,
    token,
  );
  const ids = (list.messages ?? []).map((m) => m.id);
  if (ids.length === 0) return [];

  const paths = ids.map(
    (id) =>
      `/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
  );
  const responses = await gmailBatchGet<GmailMessage>(paths, token);

  return responses.filter(Boolean).map((msg) => {
    const headers = msg!.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name === name)?.value ?? "";
    return {
      subject: header("Subject") || "(no subject)",
      date: header("Date"),
      snippet: msg!.snippet ?? "",
    };
  });
}
