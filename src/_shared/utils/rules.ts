import { getValidToken } from "./chromeAuth";
import { gmailFetch } from "./gmailApi";
import { CleanRule } from "../types/types";

interface GmailFilter {
  id?: string;
  criteria?: { from?: string };
  action?: { addLabelIds?: string[]; removeLabelIds?: string[] };
}

/**
 * Creates a server-side Gmail filter so future mail from `sender` is
 * automatically trashed or archived. Because Gmail applies filters itself,
 * this acts as a persistent "auto-clean" rule with no background polling.
 *
 * @param accountEmail - The account on which to create the rule.
 * @param sender - The sender email address to match.
 * @param action - Whether matching mail should be trashed or archived.
 * @returns The created rule.
 */
export async function addRule(
  accountEmail: string,
  sender: string,
  action: "trash" | "archive",
): Promise<CleanRule> {
  const token = await getValidToken(accountEmail);
  const filterAction =
    action === "trash"
      ? { addLabelIds: ["TRASH"] }
      : { removeLabelIds: ["INBOX"] };

  const created = await gmailFetch<GmailFilter>("/settings/filters", token, {
    method: "POST",
    body: JSON.stringify({ criteria: { from: sender }, action: filterAction }),
  });

  return { id: created.id ?? "", sender, action };
}

/**
 * Lists the auto-clean rules for an account by reading its Gmail filters and
 * keeping only those that match a single sender and trash or archive it.
 *
 * @param accountEmail - The account whose rules to list.
 * @returns The recognised auto-clean rules.
 */
export async function listRules(accountEmail: string): Promise<CleanRule[]> {
  const token = await getValidToken(accountEmail);
  const data = await gmailFetch<{ filter?: GmailFilter[] }>(
    "/settings/filters",
    token,
  );

  const rules: CleanRule[] = [];
  for (const f of data.filter ?? []) {
    const sender = f.criteria?.from;
    if (!sender || !f.id) continue;
    if (f.action?.addLabelIds?.includes("TRASH")) {
      rules.push({ id: f.id, sender, action: "trash" });
    } else if (f.action?.removeLabelIds?.includes("INBOX")) {
      rules.push({ id: f.id, sender, action: "archive" });
    }
  }
  return rules;
}

/**
 * Deletes an auto-clean rule (Gmail filter) by id.
 *
 * @param accountEmail - The account the rule belongs to.
 * @param ruleId - The Gmail filter id to delete.
 */
export async function deleteRule(
  accountEmail: string,
  ruleId: string,
): Promise<void> {
  const token = await getValidToken(accountEmail);
  await gmailFetch(`/settings/filters/${ruleId}`, token, { method: "DELETE" });
}
