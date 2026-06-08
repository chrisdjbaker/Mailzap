import {
  CleanRule,
  ManualUnsubscribeData,
  MessagePreview,
  Sender,
} from "../../types/types";
import { Actions } from "./actionsInterface";

let mockRules: CleanRule[] = [
  { id: "r1", sender: "grace@email.com", action: "trash" },
];
let nextRuleId = 2;

export const mockActions: Actions = {
  async isLoggedIn(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true); // Simulate that the user is logged in
    });
  },

  async signInWithGoogle(expectedEmailAddress: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (expectedEmailAddress === "usertest@gmail.com") {
          console.log("[MOCK] User authenticated successfully");
          resolve();
        } else {
          reject(
            new Error("Authentication failed: Email address does not match."),
          );
        }
      }, 500);
    });
  },

  async getEmailAccount(): Promise<string> {
    return new Promise((resolve) => {
      resolve("usertest@gmail.com");
    });
  },

  searchEmailSenders(emails: string[]): void {
    console.log("[MOCK] Searching for emails:", emails);
  },

  async deleteSenders(emails: string[]) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(console.log("[MOCK] Trashed senders successfully:", emails));
      }, 1000);
    });
  },

  async getAllSenders(): Promise<Sender[]> {
    return new Promise((resolve) => {
      // Size is a rough function of count so the size-sort is demonstrable.
      const mk = (email: string, name: string, count: number): Sender => ({
        email,
        name,
        count,
        size: count * 85_000,
      });
      const mockSenders: Sender[] = [
        mk("alice@email.com", "Alice", 32),
        mk("bob@email.com", "Bob", 78),
        mk("carol@email.com", "Carol", 15),
        mk("dave@email.com", "Dave", 56),
        mk("eve@email.com", "Eve", 49),
        mk("frank@email.com", "Frank", 12),
        mk("grace@email.com", "Grace", 91),
        mk("heidi@email.com", "Heidi", 27),
        mk("ivan@email.com", "Ivan", 68),
        mk("judy@email.com", "Judy", 39),
        mk("mallory@email.com", "Mallory", 50),
        mk("niaj@email.com", "Niaj", 83),
        mk("olivia@email.com", "Olivia", 21),
        mk("peggy@email.com", "Peggy", 74),
        mk("quentin@email.com", "Quentin", 59),
        mk("rupert@email.com", "Rupert", 34),
        mk("sybil@email.com", "Sybil", 88),
        mk("trent@email.com", "Trent", 44),
        mk("uma@email.com", "Uma", 66),
        mk("victor@email.com", "Victor", 29),
      ];
      setTimeout(() => {
        resolve(mockSenders);
      }, 500);
    });
  },

  async checkFetchProgress(
    setProgressCallback: (progress: number) => void,
  ): Promise<number> {
    // Mock fetch progress by incrementing a static variable
    if (!("mockProgress" in globalThis)) {
      (globalThis as any).mockProgress = 0;
    }
    (globalThis as any).mockProgress = Math.min(
      (globalThis as any).mockProgress + 0.05,
      1,
    );
    const progress = (globalThis as any).mockProgress;
    setProgressCallback(progress);
    return Promise.resolve(progress);
  },

  async unsubscribeSendersAuto(
    senderEmailAddresses: string[],
  ): Promise<ManualUnsubscribeData> {
    // Simulates unsubscribing senders automatically.
    console.log("[MOCK] Automatically unsubscribing:", senderEmailAddresses);
    return new Promise((resolve) => {
      setTimeout(() => {
        const linkOnlySenders: [string, string][] = [];
        const noUnsubscribeOptionSenders: string[] = [];

        // Carol & Dave: Mock that they have a click-link-only unsubscribe option
        if (senderEmailAddresses.includes("carol@email.com")) {
          linkOnlySenders.push([
            "carol@email.com",
            "https://example.com/unsubscribe/carol",
          ]);
        }
        if (senderEmailAddresses.includes("dave@email.com")) {
          linkOnlySenders.push([
            "dave@email.com",
            "https://example.com/unsubscribe/dave",
          ]);
        }

        // Eve & Frank: Mock that they have no unsubscribe option
        if (senderEmailAddresses.includes("eve@email.com")) {
          noUnsubscribeOptionSenders.push("eve@email.com");
        }
        if (senderEmailAddresses.includes("frank@email.com")) {
          noUnsubscribeOptionSenders.push("frank@email.com");
        }

        // All other emails: Mock that they have automatically been unsubscribed
        resolve({
          linkOnlySenders: linkOnlySenders,
          noUnsubscribeOptionSenders: noUnsubscribeOptionSenders,
        });
      }, 1000);
    });
  },

  async blockSender(senderEmailAddress: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          console.log(`[MOCK] Blocked ${senderEmailAddress} successfully`),
        );
      }, 1000);
    });
  },

  async archiveSenders(emails: string[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(console.log("[MOCK] Archived senders successfully:", emails));
      }, 1000);
    });
  },

  async undoLastDelete(): Promise<number> {
    console.log("[MOCK] Undoing last delete");
    return Promise.resolve(42);
  },

  async getSenderPreview(
    senderEmail: string,
    limit = 10,
  ): Promise<MessagePreview[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
            subject: `Sample subject ${i + 1} from ${senderEmail}`,
            date: `Mon, ${i + 1} Jan 2026 10:00:00 +0000`,
            snippet: `This is a preview snippet for message ${i + 1}...`,
          })),
        );
      }, 400);
    });
  },

  async listRules(): Promise<CleanRule[]> {
    return Promise.resolve([...mockRules]);
  },

  async addRule(
    sender: string,
    action: "trash" | "archive",
  ): Promise<CleanRule> {
    const rule: CleanRule = { id: `r${nextRuleId++}`, sender, action };
    mockRules.push(rule);
    console.log("[MOCK] Added rule:", rule);
    return Promise.resolve(rule);
  },

  async deleteRule(ruleId: string): Promise<void> {
    mockRules = mockRules.filter((r) => r.id !== ruleId);
    console.log("[MOCK] Deleted rule:", ruleId);
    return Promise.resolve();
  },
};
