jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/_shared/utils/chromeAuth");
jest.mock("../../src/_shared/utils/fetchMessageIds");

import {
  trashMultipleSenders,
  exportForTest,
} from "../../src/_shared/utils/trashSenders";
import { getValidToken } from "../../src/_shared/utils/chromeAuth";
import { fetchMessageIds } from "../../src/_shared/utils/fetchMessageIds";
import { mockResponse } from "../helpers";

const { trashSender } = exportForTest;
const token = "mock-token" as chrome.identity.GetAuthTokenResult;

beforeEach(() => {
  jest.clearAllMocks();
  (getValidToken as jest.Mock).mockResolvedValue(token);
  global.fetch = jest.fn().mockResolvedValue(mockResponse(undefined, { status: 204 }));
});

describe("trashMultipleSenders", () => {
  test("sums the per-sender counts and fetches the token once", async () => {
    const stub = jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(5);
    const result = await trashMultipleSenders(
      ["a@x.com", "b@x.com"],
      "me@x.com",
      stub,
    );
    expect(result).toBe(8);
    expect(getValidToken).toHaveBeenCalledTimes(1);
    expect(stub).toHaveBeenCalledTimes(2);
  });
});

describe("trashSender", () => {
  test("returns 0 and makes no request when there are no emails", async () => {
    (fetchMessageIds as jest.Mock).mockResolvedValue([]);
    const count = await trashSender(token, "empty@x.com");
    expect(count).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("trashes via a single batchModify call for a small sender", async () => {
    (fetchMessageIds as jest.Mock).mockResolvedValue(["m1", "m2", "m3"]);

    const count = await trashSender(token, "news@x.com");

    expect(count).toBe(3);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/messages/batchModify");
    const body = JSON.parse(init.body);
    expect(body.ids).toEqual(["m1", "m2", "m3"]);
    expect(body.addLabelIds).toContain("TRASH");
  });

  test("chunks large senders into 1000-id batches", async () => {
    const ids = Array.from({ length: 2500 }, (_, i) => `m${i}`);
    (fetchMessageIds as jest.Mock).mockResolvedValue(ids);

    const count = await trashSender(token, "spam@x.com");

    expect(count).toBe(2500);
    // 2500 ids -> ceil(2500/1000) = 3 batchModify calls.
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
