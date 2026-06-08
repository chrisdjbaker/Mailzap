jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/_shared/utils/chromeAuth");

import { addRule, listRules, deleteRule } from "../../src/_shared/utils/rules";
import { getValidToken } from "../../src/_shared/utils/chromeAuth";
import { mockResponse } from "../helpers";

const token = "tok" as chrome.identity.GetAuthTokenResult;

beforeEach(() => {
  jest.clearAllMocks();
  (getValidToken as jest.Mock).mockResolvedValue(token);
  global.fetch = jest.fn();
});

describe("addRule", () => {
  test("creates a trash filter", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({ id: "f1" }),
    );
    const rule = await addRule("me@x.com", "spam@x.com", "trash");

    expect(rule).toEqual({ id: "f1", sender: "spam@x.com", action: "trash" });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.criteria.from).toBe("spam@x.com");
    expect(body.action.addLabelIds).toEqual(["TRASH"]);
  });

  test("creates an archive filter", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({ id: "f2" }),
    );
    await addRule("me@x.com", "news@x.com", "archive");

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.action.removeLabelIds).toEqual(["INBOX"]);
  });
});

describe("listRules", () => {
  test("maps Gmail filters to recognised trash/archive rules and ignores others", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse({
        filter: [
          {
            id: "f1",
            criteria: { from: "a@x.com" },
            action: { addLabelIds: ["TRASH"] },
          },
          {
            id: "f2",
            criteria: { from: "b@x.com" },
            action: { removeLabelIds: ["INBOX"] },
          },
          {
            id: "f3",
            criteria: { from: "c@x.com" },
            action: { addLabelIds: ["IMPORTANT"] },
          },
          { id: "f4", criteria: {}, action: { addLabelIds: ["TRASH"] } },
        ],
      }),
    );

    const rules = await listRules("me@x.com");
    expect(rules).toEqual([
      { id: "f1", sender: "a@x.com", action: "trash" },
      { id: "f2", sender: "b@x.com", action: "archive" },
    ]);
  });
});

describe("deleteRule", () => {
  test("issues a DELETE for the filter id", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockResponse(undefined, { status: 204 }),
    );
    await deleteRule("me@x.com", "f1");

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/settings/filters/f1");
    expect(init.method).toBe("DELETE");
  });
});
