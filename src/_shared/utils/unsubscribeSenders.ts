/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { getValidToken } from "./chromeAuth";
import { parseListUnsubscribeHeader, getEmailAccount } from "./utils";
import { gmailFetch } from "./gmailApi";
import { ManualUnsubscribeData, UnsubscribeData } from "../types/types";

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  payload?: {
    headers?: { name: string; value: string }[];
  } & GmailMessagePart;
}

/**
 * Attempts to automatically unsubscribe from the given list of email addresses.
 *
 * Resolution order, from most to least reliable:
 *   1. RFC 8058 one-click POST (no user action, no email sent).
 *   2. `mailto:` unsubscribe (sends an email on the user's behalf).
 *   3. Click-only link — surfaced to the user for manual action.
 *   4. No unsubscribe option found.
 *
 * @param senderEmailAddresses - An array of sender email addresses to attempt to unsubscribe from.
 * @param deps - Optional dependency overrides for testing.
 * @returns A promise that resolves to a `ManualUnsubscribeData` object containing:
 *   - `linkOnlySenders`: tuples of sender email and click URL that require manual action.
 *   - `noUnsubscribeOptionSenders`: sender emails for which no unsubscribe method was found.
 */
export async function unsubscribeSendersAuto(
  senderEmailAddresses: string[],
  deps?: {
    getEmailAccount?: Function;
    getLatestMessageIds?: Function;
    getMultipleUnsubscribeData?: Function;
    unsubscribeUsingMailTo?: Function;
    unsubscribeUsingPostUrl?: Function;
  },
): Promise<ManualUnsubscribeData> {
  const {
    getEmailAccount: _getEmailAccount = getEmailAccount,
    getLatestMessageIds: _getLatestMessageIds = getLatestMessageIds,
    getMultipleUnsubscribeData:
      _getMultipleUnsubscribeData = getMultipleUnsubscribeData,
    unsubscribeUsingMailTo: _unsubscribeUsingMailTo = unsubscribeUsingMailTo,
    unsubscribeUsingPostUrl: _unsubscribeUsingPostUrl = unsubscribeUsingPostUrl,
  } = deps || {};

  const accountEmail = await _getEmailAccount();

  console.log(
    "Unsubscribing automatically from senders: ",
    senderEmailAddresses,
  );

  const messageIds: string[] = await _getLatestMessageIds(
    accountEmail,
    senderEmailAddresses,
  );

  const unsubscribeData: UnsubscribeData[] = await _getMultipleUnsubscribeData(
    messageIds,
    accountEmail,
  );

  console.log("Unsubscribe data: ", unsubscribeData);

  const linkOnlySenders: [string, string][] = [];
  const noUnsubscribeOptionSenders: string[] = [];
  await Promise.all(
    unsubscribeData.map(async (sender, index) => {
      const email = senderEmailAddresses[index];

      // 1. Safest: RFC 8058 one-click POST.
      if (sender.oneClick && sender.posturl) {
        try {
          await _unsubscribeUsingPostUrl(sender.posturl);
          return;
        } catch (error) {
          console.log(`One-click unsubscribe failed for ${email}: ${error}`);
          // Fall through to the next method.
        }
      }

      // 2. mailto: unsubscribe (sent on the user's behalf).
      if (sender.mailto !== null) {
        try {
          await _unsubscribeUsingMailTo(sender.mailto, accountEmail);
          return;
        } catch (error) {
          console.log(
            `Failed to unsubscribe using mailto for ${email}: ${error}`,
          );
        }
      }

      // 3. A click-only link the user must follow manually.
      if (sender.clickurl !== null) {
        linkOnlySenders.push([email, sender.clickurl]);
        return;
      }

      // 4. Nothing usable found.
      noUnsubscribeOptionSenders.push(email);
    }),
  );

  return {
    linkOnlySenders,
    noUnsubscribeOptionSenders,
  };
}

/**
 * Retrieves the latest message IDs from Chrome's local storage for a given account and a list of sender email addresses.
 *
 * @param accountEmail - The email address of the account whose senders are being queried.
 * @param senderEmailAddresses - An array of sender email addresses to filter and retrieve message IDs for.
 * @returns A promise that resolves to an array of message IDs (as strings) corresponding to the latest messages from the specified senders.
 */
async function getLatestMessageIds(
  accountEmail: string,
  senderEmailAddresses: string[],
) {
  const result = await chrome.storage.local.get([accountEmail]);
  const messageIds: string[] = result[accountEmail].senders
    .filter((sender: [string, string, number, string]) =>
      senderEmailAddresses.includes(sender[0]),
    )
    .map((sender: [string, string, number, string]) => sender[3]);
  return messageIds;
}

/**
 * Retrieves unsubscribe data from multiple email messages.
 *
 * @param messageIds - An array of Gmail message IDs to fetch unsubscribe data for.
 * @param accountEmail - The email address of the user whose token will be used for authentication.
 * @param getUnsubscribeDataFunc - (Optional) A function to fetch unsubscribe data for a single message. Defaults to `getUnsubscribeData`.
 * @returns A promise that resolves to an array of `UnsubscribeData` objects, each corresponding to a message ID.
 */
export async function getMultipleUnsubscribeData(
  messageIds: string[],
  accountEmail: string,
  getUnsubscribeDataFunc = getUnsubscribeData,
): Promise<UnsubscribeData[]> {
  const token = await getValidToken(accountEmail);
  const unsubscribeData: UnsubscribeData[] = [];

  for (const messageId of messageIds) {
    const data = await getUnsubscribeDataFunc(messageId, token);
    unsubscribeData.push(data);
  }

  return unsubscribeData;
}

/**
 * Sends an RFC 8058 one-click POST request to unsubscribe.
 *
 * @param url - The HTTPS unsubscribe endpoint from the `List-Unsubscribe` header.
 * @throws Will throw an error if the response is not successful.
 */
export async function unsubscribeUsingPostUrl(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to unsubscribe using POST URL: ${response.status} ${response.statusText}`,
    );
  }
  console.log(`Unsubscribed using one-click POST: ${url}`);
}

/**
 * Sends an unsubscribe email using the Gmail API and a provided mailto email address.
 *
 * @param mailtoEmail - The email address to send the unsubscribe request to.
 * @param accountEmail - The email address of the user performing the unsubscribe action.
 * @throws Will throw an error if the Gmail API request fails.
 */
async function unsubscribeUsingMailTo(
  mailtoEmail: string,
  accountEmail: string,
) {
  const token = await getValidToken(accountEmail);
  const message: string = buildEmailMessage(mailtoEmail);

  await gmailFetch("/messages/send", token, {
    method: "POST",
    body: JSON.stringify({ raw: message }),
  });
  console.log(`Unsubscribed using mailto: ${mailtoEmail}`);
}

/**
 * Retrieves unsubscribe information for a given email message. It first checks
 * the `List-Unsubscribe`/`List-Unsubscribe-Post` headers; if no mailto/one-click
 * option is found there, it falls back to scraping a clickable unsubscribe link
 * from the message body.
 *
 * @param messageId - The unique identifier of the email message to process.
 * @param token - An authentication token required to access the email data.
 * @param getHeader - (Optional) Header extractor. Defaults to `getListUnsubscribeHeader`.
 * @param getClickLink - (Optional) Body link extractor. Defaults to `getUnsubscribeLinkFromBody`.
 * @returns A promise that resolves to an `UnsubscribeData` object.
 */
async function getUnsubscribeData(
  messageId: string,
  token: chrome.identity.GetAuthTokenResult,
  getHeader = getListUnsubscribeHeader,
  getClickLink = getUnsubscribeLinkFromBody,
): Promise<UnsubscribeData> {
  const headerData: UnsubscribeData = await getHeader(messageId, token);

  // A one-click POST or mailto from the header needs no body scraping.
  if ((headerData.oneClick && headerData.posturl) || headerData.mailto) {
    return headerData;
  }

  const unsubscribeLink = await getClickLink(messageId, token);
  return {
    ...headerData,
    clickurl: unsubscribeLink,
  };
}

/**
 * Retrieves and parses the `List-Unsubscribe` and `List-Unsubscribe-Post`
 * headers from a Gmail message.
 *
 * @param messageId - The Gmail ID of the message to inspect.
 * @param token - The OAuth2 access token.
 * @returns Parsed unsubscribe information, or empty values on error.
 */
async function getListUnsubscribeHeader(
  messageId: string,
  token: chrome.identity.GetAuthTokenResult,
): Promise<UnsubscribeData> {
  try {
    const data = await gmailFetch<GmailMessage>(
      `/messages/${messageId}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post`,
      token,
    );
    const headers = data.payload?.headers ?? [];
    const listUnsub = headers.find(
      (h) => h.name === "List-Unsubscribe",
    )?.value;
    const post = headers.find(
      (h) => h.name === "List-Unsubscribe-Post",
    )?.value;

    const parsed = parseListUnsubscribeHeader(listUnsub);
    parsed.oneClick = Boolean(post?.toLowerCase().includes("one-click"));
    return parsed;
  } catch (error) {
    console.error(
      `Error getting List-Unsubscribe header for message ${messageId}:`,
      error,
    );
    return { posturl: null, mailto: null, clickurl: null, oneClick: false };
  }
}

/**
 * Retrieves the clickable unsubscribe link from the HTML body of a Gmail message.
 *
 * Walks the full MIME tree (handling nested multipart/alternative bodies, which
 * the previous top-level-only scan missed) to find a `text/html` part, decodes
 * it, and extracts an anchor whose text or href mentions "unsubscribe".
 *
 * @param messageId - The Gmail ID of the message to inspect.
 * @param token - The OAuth 2.0 access token.
 * @returns The unsubscribe link, or `null` if not found or on error.
 */
async function getUnsubscribeLinkFromBody(
  messageId: string,
  token: chrome.identity.GetAuthTokenResult,
): Promise<string | null> {
  try {
    const data = await gmailFetch<GmailMessage>(
      `/messages/${messageId}?format=full`,
      token,
    );

    const html = data.payload ? findHtmlBody(data.payload) : null;
    if (!html) return null;

    const decodedBody = decodeBase64Url(html);

    // Prefer an anchor whose visible text is "unsubscribe"...
    const byText = decodedBody.match(
      /<a[^>]+href="([^"]+)"[^>]*>[^<]*unsubscribe[^<]*<\/a>/i,
    );
    if (byText) return byText[1];

    // ...otherwise fall back to an anchor whose href looks like an unsubscribe URL.
    const byHref = decodedBody.match(/<a[^>]+href="([^"]*unsubscribe[^"]*)"/i);
    return byHref ? byHref[1] : null;
  } catch (error) {
    console.error(
      `Error getting unsubscribe link from body for message ${messageId}:`,
      error,
    );
    return null;
  }
}

/**
 * Recursively searches a Gmail MIME part tree for the first `text/html` body data.
 *
 * @param part - The MIME part (or payload) to search.
 * @returns The base64url-encoded HTML body data, or `null` if none is found.
 */
function findHtmlBody(part: GmailMessagePart): string | null {
  if (part.mimeType === "text/html" && part.body?.data) {
    return part.body.data;
  }
  for (const child of part.parts ?? []) {
    const found = findHtmlBody(child);
    if (found) return found;
  }
  return null;
}

/**
 * Decodes a Gmail base64url-encoded string into text.
 */
function decodeBase64Url(data: string): string {
  return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
}

/**
 * Constructs and encodes an email message to send to the recipient for unsubscribing, formatted for Gmail API usage.
 *
 * @param recipient - The email address to which the unsubscribe message will be sent.
 * @returns The email message as an RFC 2822 formatted and base64url encoded string.
 */
function buildEmailMessage(recipient: string) {
  const rawLines = [
    `To: ${recipient}`,
    "Subject: unsubscribe",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    "This message was automatically generated by Mailzap.",
  ];
  const raw = rawLines.join("\r\n");

  const encoded = btoa(decodeURIComponent(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return encoded;
}

export const exportForTest = {
  unsubscribeUsingMailTo,
  unsubscribeUsingPostUrl,
  getLatestMessageIds,
  getListUnsubscribeHeader,
  getUnsubscribeLinkFromBody,
  getUnsubscribeData,
  findHtmlBody,
};
