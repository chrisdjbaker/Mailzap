jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/_shared/utils/chromeAuth");
jest.mock("../../src/_shared/utils/fetchMessageIds");

import {
  trashMultipleSenders,
  archiveMultipleSenders,
  undoLastTrash,
} from "../../src/_shared/utils/modifySenders";
import { getValidToken } from "../../src/_shared/utils/chromeAuth";
import { fetchMessageIds } from "../../src/_shared/utils/fetchMessageIds";
import { mockResponse, mockChromeStorage } from "../helpers";

const token = "tok" as chrome.identity.GetAuthTokenResult;
let store: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  store = mockChromeStorage();
  (getValidToken as jest.Mock).mockResolvedValue(token);
  global.fetch = jest
    .fn()
    .mockResolvedValue(mockResponse(undefined, { status: 204 }));
});

function bodyOf(callIndex: number) {
  return JSON.parse((global.fetch as jest.Mock).mock.calls[callIndex][1].body);
}

describe("trashMultipleSenders", () => {
  test("adds TRASH, removes INBOX, and records the undo buffer", async () => {
    (fetchMessageIds as jest.Mock).mockResolvedValue(["m1", "m2"]);

    const count = await trashMultipleSenders(["a@x.com"], "me@x.com");

    expect(count).toBe(2);
    const body = bodyOf(0);
    expect(body.addLabelIds).toEqual(["TRASH"]);
    expect(body.removeLabelIds).toEqual(["INBOX"]);
    expect(store["mz_lasttrash_me@x.com"]).toEqual(["m1", "m2"]);
  });
});

describe("archiveMultipleSenders", () => {
  test("removes INBOX only (no TRASH) and does not set an undo buffer", async () => {
    (fetchMessageIds as jest.Mock).mockResolvedValue(["m1"]);

    const count = await archiveMultipleSenders(["a@x.com"], "me@x.com");

    expect(count).toBe(1);
    const body = bodyOf(0);
    expect(body.removeLabelIds).toEqual(["INBOX"]);
    expect(body.addLabelIds).toBeUndefined();
    expect(store["mz_lasttrash_me@x.com"]).toBeUndefined();
  });
});

describe("undoLastTrash", () => {
  test("restores INBOX, removes TRASH, and clears the undo buffer", async () => {
    store["mz_lasttrash_me@x.com"] = ["m1", "m2", "m3"];

    const count = await undoLastTrash("me@x.com");

    expect(count).toBe(3);
    const body = bodyOf(0);
    expect(body.addLabelIds).toEqual(["INBOX"]);
    expect(body.removeLabelIds).toEqual(["TRASH"]);
    expect(store["mz_lasttrash_me@x.com"]).toEqual([]);
  });

  test("is a no-op with nothing to undo", async () => {
    const count = await undoLastTrash("me@x.com");
    expect(count).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
