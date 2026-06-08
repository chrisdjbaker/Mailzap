import { gmailFetch } from "./gmailApi";

interface MessageListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * Fetches all message IDs from the user's mailbox by iteratively retrieving paginated results.
 *
 * @param token - The authentication token used for authorizing the Gmail API request.
 * @param senderEmail - Optional parameter: The email address of the sender whose messages are to be retrieved.
 * @param deps - Optional dependency overrides for testing.
 * @returns A promise that resolves to an array of message IDs (as strings).
 */
export async function fetchMessageIds(
  token: chrome.identity.GetAuthTokenResult,
  senderEmail?: string,
  deps?: {
    fetchMessageIdsPage?: typeof fetchMessageIdsPage;
  },
): Promise<string[]> {
  const { fetchMessageIdsPage: _fetchMessageIdsPage = fetchMessageIdsPage } =
    deps || {};

  let nextPageToken: string | null = null;
  const allMessageIds: string[] = [];

  do {
    const { messageIds, nextPage } = await _fetchMessageIdsPage(
      token,
      nextPageToken,
      senderEmail,
    );
    allMessageIds.push(...messageIds);
    nextPageToken = nextPage;
  } while (nextPageToken);

  console.log(`Fetched ${allMessageIds.length} email IDs.`);
  return allMessageIds;
}

/**
 * Fetches a list of message IDs sent by a specific sender for a given page, handling rate limiting.
 *
 * @param token - The OAuth 2.0 access token used for authenticating the request.
 * @param pageToken - The token for the results page to retrieve, or `null` to fetch the first page.
 * @param senderEmail - Optional parameter: The email address of the sender whose messages are to be searched.
 * @returns A promise that resolves to an object containing an array of message IDs and the next page token (or `null` if there are no more pages).
 *
 * @remarks
 * Rate limiting and transient errors are handled centrally by {@link gmailFetch}.
 */
async function fetchMessageIdsPage(
  token: chrome.identity.GetAuthTokenResult,
  pageToken: string | null,
  senderEmail?: string,
): Promise<{ messageIds: string[]; nextPage: string | null }> {
  let path = `/messages?maxResults=500`;
  if (senderEmail) {
    path += `&q=from:${encodeURIComponent(senderEmail)}`;
  }
  if (pageToken) {
    path += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const data = await gmailFetch<MessageListResponse>(path, token);

  // Gmail omits `messages` entirely when there are zero matches — guard against it.
  const messages = data.messages ?? [];
  console.log(`Found ${messages.length} messages from ${senderEmail ?? "all"}`);

  return {
    messageIds: messages.map((m) => m.id),
    nextPage: data.nextPageToken || null,
  };
}

export const exportForTest = {
  fetchMessageIdsPage,
};
