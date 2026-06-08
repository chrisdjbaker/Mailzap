import {
  parseSender,
  parseListUnsubscribeHeader,
  formatBytes,
} from "../../src/_shared/utils/utils";

describe("formatBytes", () => {
  test.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1.0 KB"],
    [1024 * 1024, "1.0 MB"],
    [5 * 1024 * 1024, "5.0 MB"],
    [1024 * 1024 * 1024, "1.0 GB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("parseSender", () => {
  test("extracts name and email", () => {
    expect(parseSender("John Doe <john@example.com>")).toEqual([
      "john@example.com",
      "John Doe",
    ]);
  });

  test("handles a bare email with no name", () => {
    expect(parseSender("aaron@example.com")).toEqual([
      "aaron@example.com",
      "aaron",
    ]);
  });

  test("strips surrounding quotation marks from the name", () => {
    expect(parseSender('"John Doe" <john@example.com>')).toEqual([
      "john@example.com",
      "John Doe",
    ]);
  });

  test("returns a sentinel for null input", () => {
    expect(parseSender(null)).toEqual(["null", "Unknown Sender"]);
  });
});

describe("parseListUnsubscribeHeader", () => {
  test("parses both posturl and mailto", () => {
    const header =
      "<https://example.com/unsubscribe>, <mailto:unsub@example.com>";
    expect(parseListUnsubscribeHeader(header)).toEqual({
      posturl: "https://example.com/unsubscribe",
      mailto: "unsub@example.com",
      clickurl: null,
      oneClick: false,
    });
  });

  test("handles whitespace around angle brackets (regression)", () => {
    // The old implementation used the untrimmed length when stripping
    // brackets, mangling values that had leading/trailing whitespace.
    const header = "  <https://example.com/unsub>  ";
    expect(parseListUnsubscribeHeader(header).posturl).toBe(
      "https://example.com/unsub",
    );
  });

  test("returns all-null data for a missing header", () => {
    expect(parseListUnsubscribeHeader(undefined)).toEqual({
      posturl: null,
      mailto: null,
      clickurl: null,
      oneClick: false,
    });
  });
});
