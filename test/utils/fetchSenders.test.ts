import { exportForTest } from "../../src/_shared/utils/fetchSenders";
import {
  SenderAgg,
  MessageIndex,
} from "../../src/_shared/utils/senderStore";

const { addMessage } = exportForTest;

describe("addMessage", () => {
  test("aggregates count/size and records the message index", () => {
    const senders: Record<string, SenderAgg> = {};
    const index: MessageIndex = {};

    addMessage(senders, index, {
      senderEmail: "a@x.com",
      senderName: "Alice",
      messageId: "m1",
      size: 100,
    });
    addMessage(senders, index, {
      senderEmail: "a@x.com",
      senderName: "Alice Smith",
      messageId: "m2",
      size: 200,
    });

    expect(senders["a@x.com"].count).toBe(2);
    expect(senders["a@x.com"].size).toBe(300);
    // Shortest name is kept when serialised; both are tracked here.
    expect(senders["a@x.com"].names.has("Alice")).toBe(true);
    expect(index["m1"]).toEqual(["a@x.com", 100]);
    expect(index["m2"]).toEqual(["a@x.com", 200]);
  });
});
