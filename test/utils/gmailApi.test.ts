// Replace the real `sleep` with a no-op so backoff doesn't slow the suite.
jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

import {
  gmailFetch,
  parseBatchResponse,
  GMAIL_BATCH_LIMIT,
  gmailBatchGet,
} from "../../src/_shared/utils/gmailApi";
import { mockResponse } from "../helpers";

const token = "tok" as chrome.identity.GetAuthTokenResult;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe("gmailFetch", () => {
  test("returns parsed JSON on success and resolves relative paths", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({ hello: "world" }),
    );

    const result = await gmailFetch("/messages", token);

    expect(result).toEqual({ hello: "world" });
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toBe(
      "https://www.googleapis.com/gmail/v1/users/me/messages",
    );
  });

  test("retries on 429 then succeeds", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockResponse({ error: {} }, { status: 429 }))
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    const result = await gmailFetch("/messages", token);

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("does NOT retry a permanent 403 (insufficient permissions)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      ),
    );

    await expect(gmailFetch("/messages", token)).rejects.toThrow(/403/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("retries a transient 403 (rateLimitExceeded)", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse(
          { error: { errors: [{ reason: "rateLimitExceeded" }] } },
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    await expect(gmailFetch("/messages", token)).resolves.toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("gives up after exhausting retries instead of looping forever", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ error: { message: "slow down" } }, { status: 429 }),
    );

    await expect(gmailFetch("/messages", token)).rejects.toThrow(/429/);
    // 1 initial attempt + 5 retries.
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  test("returns multipart text untouched (not JSON-parsed)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse("--boundary--", { contentType: "multipart/mixed" }),
    );

    const result = await gmailFetch("https://batch", token);
    expect(result).toBe("--boundary--");
  });
});

describe("parseBatchResponse", () => {
  test("maps each part back to its request index via Content-ID", () => {
    const text = [
      "--batch_abc",
      "Content-Type: application/http",
      "Content-ID: <response-item-0>",
      "",
      "HTTP/1.1 200 OK",
      "Content-Type: application/json",
      "",
      '{"id":"a"}',
      "--batch_abc",
      "Content-Type: application/http",
      "Content-ID: <response-item-1>",
      "",
      "HTTP/1.1 200 OK",
      "Content-Type: application/json",
      "",
      '{"id":"b"}',
      "--batch_abc--",
    ].join("\r\n");

    const parsed = parseBatchResponse(text, 2);
    expect(parsed).toEqual([{ id: "a" }, { id: "b" }]);
  });

  test("yields null for a missing part", () => {
    const text = [
      "--b",
      "Content-ID: <response-item-1>",
      "",
      '{"id":"b"}',
      "--b--",
    ].join("\r\n");

    const parsed = parseBatchResponse(text, 2);
    expect(parsed).toEqual([null, { id: "b" }]);
  });
});

describe("gmailBatchGet", () => {
  test("rejects batches larger than the Gmail limit", async () => {
    const paths = new Array(GMAIL_BATCH_LIMIT + 1).fill("/messages/x");
    await expect(gmailBatchGet(paths, token)).rejects.toThrow(/batch limit/);
  });

  test("returns [] for an empty input without calling fetch", async () => {
    const result = await gmailBatchGet([], token);
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
