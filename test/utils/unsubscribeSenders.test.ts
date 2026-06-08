jest.mock("../../src/_shared/utils/utils", () => ({
  ...jest.requireActual("../../src/_shared/utils/utils"),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

import {
  unsubscribeSendersAuto,
  exportForTest,
} from "../../src/_shared/utils/unsubscribeSenders";

const { findHtmlBody, getUnsubscribeData } = exportForTest;

beforeEach(() => jest.clearAllMocks());

describe("unsubscribeSendersAuto routing", () => {
  const baseDeps = {
    getEmailAccount: jest.fn().mockResolvedValue("me@x.com"),
    getLatestMessageIds: jest.fn().mockResolvedValue(["mid"]),
  };

  test("prefers one-click POST over mailto when both are available", async () => {
    const postStub = jest.fn().mockResolvedValue(undefined);
    const mailStub = jest.fn().mockResolvedValue(undefined);

    const result = await unsubscribeSendersAuto(["news@x.com"], {
      ...baseDeps,
      getMultipleUnsubscribeData: jest.fn().mockResolvedValue([
        {
          posturl: "https://x.com/unsub",
          mailto: "unsub@x.com",
          clickurl: null,
          oneClick: true,
        },
      ]),
      unsubscribeUsingPostUrl: postStub,
      unsubscribeUsingMailTo: mailStub,
    });

    expect(postStub).toHaveBeenCalledWith("https://x.com/unsub");
    expect(mailStub).not.toHaveBeenCalled();
    expect(result.linkOnlySenders).toEqual([]);
    expect(result.noUnsubscribeOptionSenders).toEqual([]);
  });

  test("falls back to mailto when one-click is unavailable", async () => {
    const mailStub = jest.fn().mockResolvedValue(undefined);

    await unsubscribeSendersAuto(["news@x.com"], {
      ...baseDeps,
      getMultipleUnsubscribeData: jest.fn().mockResolvedValue([
        { posturl: null, mailto: "unsub@x.com", clickurl: null, oneClick: false },
      ]),
      unsubscribeUsingMailTo: mailStub,
    });

    expect(mailStub).toHaveBeenCalledWith("unsub@x.com", "me@x.com");
  });

  test("surfaces click-only senders for manual action", async () => {
    const result = await unsubscribeSendersAuto(["news@x.com"], {
      ...baseDeps,
      getMultipleUnsubscribeData: jest.fn().mockResolvedValue([
        {
          posturl: null,
          mailto: null,
          clickurl: "https://x.com/click",
          oneClick: false,
        },
      ]),
    });

    expect(result.linkOnlySenders).toEqual([
      ["news@x.com", "https://x.com/click"],
    ]);
  });

  test("reports senders with no unsubscribe option", async () => {
    const result = await unsubscribeSendersAuto(["news@x.com"], {
      ...baseDeps,
      getMultipleUnsubscribeData: jest.fn().mockResolvedValue([
        { posturl: null, mailto: null, clickurl: null, oneClick: false },
      ]),
    });

    expect(result.noUnsubscribeOptionSenders).toEqual(["news@x.com"]);
  });
});

describe("findHtmlBody", () => {
  test("finds an HTML body nested inside multipart/alternative", () => {
    const payload = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            { mimeType: "text/plain", body: { data: "plain" } },
            { mimeType: "text/html", body: { data: "HTML_DATA" } },
          ],
        },
      ],
    };
    expect(findHtmlBody(payload)).toBe("HTML_DATA");
  });

  test("returns null when there is no HTML part", () => {
    const payload = {
      mimeType: "text/plain",
      body: { data: "plain" },
    };
    expect(findHtmlBody(payload)).toBeNull();
  });
});

describe("getUnsubscribeData", () => {
  const token = "tok" as chrome.identity.GetAuthTokenResult;

  test("short-circuits on a header mailto without scraping the body", async () => {
    const getHeader = jest.fn().mockResolvedValue({
      posturl: null,
      mailto: "unsub@x.com",
      clickurl: null,
      oneClick: false,
    });
    const getClickLink = jest.fn();

    const data = await getUnsubscribeData("mid", token, getHeader, getClickLink);

    expect(data.mailto).toBe("unsub@x.com");
    expect(getClickLink).not.toHaveBeenCalled();
  });

  test("scrapes the body when the header has no usable option", async () => {
    const getHeader = jest.fn().mockResolvedValue({
      posturl: null,
      mailto: null,
      clickurl: null,
      oneClick: false,
    });
    const getClickLink = jest.fn().mockResolvedValue("https://x.com/unsub");

    const data = await getUnsubscribeData("mid", token, getHeader, getClickLink);

    expect(getClickLink).toHaveBeenCalled();
    expect(data.clickurl).toBe("https://x.com/unsub");
  });
});
