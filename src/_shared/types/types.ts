export interface Sender {
  name: string;
  email: string;
  count: number;
  /** Approximate total size of this sender's messages, in bytes. */
  size: number;
}

/**
 * A saved auto-clean rule, backed by a Gmail server-side filter so Gmail
 * applies it automatically to incoming mail.
 *
 * @property id - The Gmail filter id (used to delete the rule).
 * @property sender - The sender email address the rule matches.
 * @property action - What Gmail does to matching mail: trash it or archive it.
 */
export interface CleanRule {
  id: string;
  sender: string;
  action: "trash" | "archive";
}

/** A single message preview shown in the per-sender drill-down. */
export interface MessagePreview {
  subject: string;
  date: string;
  snippet: string;
}

/**
 * Represents the available unsubscribe options for a single email sender.
 *
 * @property posturl - The URL to send an HTTP POST request to unsubscribe, or null if not available.
 * @property mailto - The mailto link to send an unsubscribe email, or null if not available.
 * @property clickurl - The URL to visit in order to unsubscribe, or null if not available.
 * @property oneClick - Whether the sender supports RFC 8058 one-click POST unsubscribe.
 */
export interface UnsubscribeData {
  posturl: string | null;
  mailto: string | null;
  clickurl: string | null;
  /**
   * True when the sender advertises RFC 8058 one-click unsubscribe
   * (`List-Unsubscribe-Post: List-Unsubscribe=One-Click`). Only then is it safe
   * to POST to `posturl` automatically without user interaction.
   */
  oneClick: boolean;
}

/**
 * Represents data related to a number of email senders that cannot be automatically unsubscribed from.
 *
 * @property linkOnlySenders - An array of tuples, where each tuple contains:
 *   - The sender's email address as a string.
 *   - The corresponding clickable unsubscribe link as a string.
 *   Used for senders that provide an unsubscribe link but require manual action.
 *
 * @property noUnsubscribeOptionSenders - An array of email addresses (strings) for senders
 *   that do not provide any unsubscribe option.
 */
export interface ManualUnsubscribeData {
  linkOnlySenders: [string, string][];
  noUnsubscribeOptionSenders: string[];
}
