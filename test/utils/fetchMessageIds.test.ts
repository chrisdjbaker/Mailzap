jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

import {
  fetchMessageIds,
  exportForTest,
} from "../../src/_shared/utils/fetchMessageIds";
import { mockResponse } from "../helpers";

const { fetchMessageIdsPage } = exportForTest;
const token = "tok" as chrome.identity.GetAuthTokenResult;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe("fetchMessageIdsPage", () => {
  test("does not crash when Gmail omits `messages` (zero results)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({ resultSizeEstimate: 0 }),
    );

    const result = await fetchMessageIdsPage(token, null, "nobody@example.com");
    expect(result).toEqual({ messageIds: [], nextPage: null });
  });

  test("extracts ids and the next page token", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({
        messages: [{ id: "1" }, { id: "2" }],
        nextPageToken: "PAGE2",
      }),
    );

    const result = await fetchMessageIdsPage(token, null);
    expect(result).toEqual({ messageIds: ["1", "2"], nextPage: "PAGE2" });
  });
});

describe("fetchMessageIds", () => {
  test("paginates until no next page token remains", async () => {
    const page = jest
      .fn()
      .mockResolvedValueOnce({ messageIds: ["a", "b"], nextPage: "P2" })
      .mockResolvedValueOnce({ messageIds: ["c"], nextPage: null });

    const ids = await fetchMessageIds(token, undefined, {
      fetchMessageIdsPage: page,
    });

    expect(ids).toEqual(["a", "b", "c"]);
    expect(page).toHaveBeenCalledTimes(2);
  });
});
