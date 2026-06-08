import { CleanRule, MessagePreview, Sender } from "../../types/types";
import { fetchAllSenders } from "../fetchSenders";
import { syncSenders } from "../syncSenders";
import {
  trashMultipleSenders,
  archiveMultipleSenders,
  undoLastTrash,
} from "../modifySenders";
import { unsubscribeSendersAuto } from "../unsubscribeSenders";
import { Actions } from "./actionsInterface";
import { getValidToken, signInWithGoogle } from "../chromeAuth";
import { getEmailAccount } from "../utils";
import { addRule, deleteRule, listRules } from "../rules";
import { getSenderPreview } from "../senderPreview";
import { readAccount, writeAccount, tuplesToSenders } from "../senderStore";

export const realActions: Actions = {
  async isLoggedIn(
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<boolean> {
    try {
      const accountEmail = await getEmailAccount();
      await getValidToken(accountEmail);
      return true;
    } catch {
      return false;
    }
  },

  signInWithGoogle,

  getEmailAccount,

  searchEmailSenders(senderEmailAddresses: string[]): void {
    console.log("Searching for emails: ", senderEmailAddresses);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SEARCH_EMAIL_SENDERS",
          emails: senderEmailAddresses,
        });
      } else {
        console.error("No active tab found.");
      }
    });
  },

  async deleteSenders(
    senderEmailAddresses: string[],
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<void> {
    const accountEmail = await getEmailAccount();
    await trashMultipleSenders(senderEmailAddresses, accountEmail);
    await removeSendersFromStore(accountEmail, senderEmailAddresses);
    console.log("Trashed senders successfully");
  },

  async archiveSenders(
    senderEmailAddresses: string[],
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<void> {
    const accountEmail = await getEmailAccount();
    await archiveMultipleSenders(senderEmailAddresses, accountEmail);
    await removeSendersFromStore(accountEmail, senderEmailAddresses);
    console.log("Archived senders successfully");
  },

  async undoLastDelete(
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<number> {
    const accountEmail = await getEmailAccount();
    return undoLastTrash(accountEmail);
  },

  async getAllSenders(
    fetchNew: boolean = false,
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<Sender[]> {
    const accountEmail = await getEmailAccount();

    if (fetchNew) {
      // Prefer a cheap incremental sync; falls back to a full scan internally.
      await syncSenders(accountEmail);
    }

    let stored = await readAccount(accountEmail);
    if (stored.senders.length === 0) {
      await fetchAllSenders(accountEmail);
      stored = await readAccount(accountEmail);
    }

    return tuplesToSenders(stored.senders);
  },

  async checkFetchProgress(
    setProgressCallback: (progress: number) => void,
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<number> {
    const accountEmail = await getEmailAccount();
    return new Promise((resolve) => {
      chrome.storage.local.get("fetchProgress").then((data) => {
        if (
          data.fetchProgress !== undefined &&
          data.fetchProgress[accountEmail]
        ) {
          setProgressCallback(data.fetchProgress[accountEmail]);
          resolve(data.fetchProgress[accountEmail]);
        } else {
          setProgressCallback(0);
          resolve(0);
        }
      });
    });
  },

  unsubscribeSendersAuto,

  async blockSender(
    senderEmailAddress: string,
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<void> {
    const accountEmail = await getEmailAccount();
    await addRule(accountEmail, senderEmailAddress, "trash");
  },

  async getSenderPreview(
    senderEmail: string,
    limit = 10,
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<MessagePreview[]> {
    const accountEmail = await getEmailAccount();
    return getSenderPreview(accountEmail, senderEmail, limit);
  },

  async listRules(
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<CleanRule[]> {
    const accountEmail = await getEmailAccount();
    return listRules(accountEmail);
  },

  async addRule(
    sender: string,
    action: "trash" | "archive",
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<CleanRule> {
    const accountEmail = await getEmailAccount();
    return addRule(accountEmail, sender, action);
  },

  async deleteRule(
    ruleId: string,
    getEmailAccount: () => Promise<string> = realActions.getEmailAccount,
  ): Promise<void> {
    const accountEmail = await getEmailAccount();
    return deleteRule(accountEmail, ruleId);
  },
};

/**
 * Removes the given senders from stored sender data while preserving the
 * account's history cursor (so a subsequent incremental sync still works).
 */
async function removeSendersFromStore(
  accountEmail: string,
  senderEmailAddresses: string[],
): Promise<void> {
  const stored = await readAccount(accountEmail);
  const remove = new Set(senderEmailAddresses);
  await writeAccount(accountEmail, {
    ...stored,
    senders: stored.senders.filter(([email]) => !remove.has(email)),
  });
}
