import {
  tuplesToAgg,
  aggToTuples,
  tuplesToSenders,
  SenderTuple,
} from "../../src/_shared/utils/senderStore";

describe("senderStore conversions", () => {
  const tuples: SenderTuple[] = [
    ["a@x.com", "Alice", 3, "m3", 300],
    ["b@x.com", "Bob", 1, "m1", 100],
  ];

  test("tuplesToAgg / aggToTuples round-trips and sorts by count desc", () => {
    const agg = tuplesToAgg(tuples);
    expect(agg["a@x.com"].count).toBe(3);
    expect(agg["a@x.com"].size).toBe(300);

    const back = aggToTuples(agg);
    expect(back[0][0]).toBe("a@x.com"); // highest count first
    expect(back).toHaveLength(2);
  });

  test("aggToTuples drops senders whose count dropped to zero", () => {
    const agg = tuplesToAgg(tuples);
    agg["b@x.com"].count = 0;
    const back = aggToTuples(agg);
    expect(back.map((t) => t[0])).toEqual(["a@x.com"]);
  });

  test("legacy 4-tuples (no size) default to size 0", () => {
    const legacy = [["a@x.com", "Alice", 2, "m2"]] as unknown as SenderTuple[];
    expect(tuplesToAgg(legacy)["a@x.com"].size).toBe(0);
    expect(tuplesToSenders(legacy)[0].size).toBe(0);
  });

  test("tuplesToSenders filters out self and null senders", () => {
    const t: SenderTuple[] = [
      ["me@gmail.com", "Me", 5, "m", 0],
      ["null", "Unknown", 5, "m", 0],
      ["news@x.com", "News", 5, "m", 50],
    ];
    expect(tuplesToSenders(t).map((s) => s.email)).toEqual(["news@x.com"]);
  });
});
