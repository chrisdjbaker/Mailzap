jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

import { exportForTest } from "../../src/_shared/utils/syncSenders";
import { mockResponse } from "../helpers";

const { collectHistory } = exportForTest;
const token = "tok" as chrome.identity.GetAuthTokenResult;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe("collectHistory", () => {
  test("aggregates added/deleted ids across pages and advances the cursor", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          history: [{ messagesAdded: [{ message: { id: "a1" } }] }],
          nextPageToken: "P2",
          historyId: "100",
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          history: [{ messagesDeleted: [{ message: { id: "d1" } }] }],
          historyId: "200",
        }),
      );

    const { added, deleted, newHistoryId } = await collectHistory(token, "50");

    expect(added).toEqual(["a1"]);
    expect(deleted).toEqual(["d1"]);
    expect(newHistoryId).toBe("200");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("a message added then deleted in-window nets to nothing", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({
        history: [
          { messagesAdded: [{ message: { id: "x" } }] },
          { messagesDeleted: [{ message: { id: "x" } }] },
        ],
        historyId: "300",
      }),
    );

    const { added, deleted } = await collectHistory(token, "50");
    expect(added).toEqual([]);
    expect(deleted).toEqual(["x"]);
  });
});
