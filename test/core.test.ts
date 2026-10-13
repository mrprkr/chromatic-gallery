import { describe, expect, it } from "vitest";
import {
  balanceColumns,
  colorBlur,
  findSimilarPairs,
  groupByMonth,
  groupDuplicates,
  hueFamily,
  isValidPhash,
  phashDistance,
  shuffleWithinChromaticOrder,
  sortChromatically,
} from "../src/core";

/** Deterministic PRNG so shuffle tests are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("hueFamily", () => {
  it.each([
    ["#d64545", "red"],
    ["#e08a3c", "orange"],
    ["#d9c23c", "yellow"],
    ["#4caf72", "green"],
    ["#4a78d6", "blue"],
    ["#9b59c6", "purple"],
    ["#9ca3af", "neutral"],
    ["#000000", "neutral"],
  ])("%s is %s", (hex, family) => {
    expect(hueFamily(hex)).toBe(family);
  });

  it("treats missing or malformed colours as neutral", () => {
    expect(hueFamily(undefined)).toBe("neutral");
    expect(hueFamily("red")).toBe("neutral");
    expect(hueFamily("#fff")).toBe("neutral");
  });
});

describe("sortChromatically", () => {
  it("orders round the wheel with greys, then uncoloured photos, last", () => {
    const photos = [
      { id: "none" },
      { id: "grey", colors: ["#9ca3af"] },
      { id: "blue", colors: ["#4a78d6"] },
      { id: "red", colors: ["#d64545"] },
      { id: "green", colors: ["#4caf72"] },
    ];
    expect(sortChromatically(photos).map((p) => p.id)).toEqual(["red", "green", "blue", "grey", "none"]);
  });

  it("does not mutate its input", () => {
    const photos = [{ colors: ["#4a78d6"] }, { colors: ["#d64545"] }];
    sortChromatically(photos);
    expect(photos[0].colors[0]).toBe("#4a78d6");
  });
});

describe("shuffleWithinChromaticOrder", () => {
  const photos = [
    ...["r1", "r2", "r3"].map((id) => ({ id, colors: ["#d64545"] })),
    ...["g1", "g2"].map((id) => ({ id, colors: ["#4caf72"] })),
    ...["b1", "b2", "b3"].map((id) => ({ id, colors: ["#4a78d6"] })),
  ];

  it("keeps every photo", () => {
    const result = shuffleWithinChromaticOrder(photos, seeded(1));
    expect(result.map((p) => p.id).sort()).toEqual(photos.map((p) => p.id).sort());
  });

  it("keeps bands contiguous and in cyclic order", () => {
    for (let seed = 1; seed < 20; seed++) {
      const families = shuffleWithinChromaticOrder(photos, seeded(seed)).map((p) => hueFamily(p.colors[0]));
      const bands = families.filter((f, i) => i === 0 || f !== families[i - 1]);
      expect(bands).toHaveLength(3);
      const start = ["red", "green", "blue"].indexOf(bands[0]);
      expect(bands).toEqual([0, 1, 2].map((i) => ["red", "green", "blue"][(start + i) % 3]));
    }
  });

  it("handles an empty list", () => {
    expect(shuffleWithinChromaticOrder([])).toEqual([]);
  });
});

describe("groupByMonth", () => {
  it("groups newest first with undated last", () => {
    const groups = groupByMonth([
      { date: "2024-03-02" },
      { date: null },
      { date: "2025-01-15" },
      { date: "2024-03-20" },
      { date: "not a date" },
    ]);
    expect(groups.map((g) => [g.key, g.photos.length])).toEqual([
      ["2025-01", 1],
      ["2024-03", 2],
      ["undated", 2],
    ]);
    expect(groups[0].label).toBe("January 2025");
    expect(groups[2].label).toBe("Undated");
  });

  it("uses the given locale and undated label", () => {
    const [dated, undated] = groupByMonth([{ date: "2024-03-02" }, {}], {
      locale: "fr-FR",
      undatedLabel: "Sans date",
    });
    expect(dated.label).toBe("mars 2024");
    expect(undated.label).toBe("Sans date");
  });
});

describe("balanceColumns", () => {
  const sized = (id: string, width: number, height: number) => ({ id, width, height });

  it("fills same-shaped photos row-first", () => {
    const photos = ["a", "b", "c", "d", "e"].map((id) => sized(id, 800, 600));
    const ids = balanceColumns(photos, 3).map((col) => col.map((c) => c.photo.id));
    expect(ids).toEqual([["a", "d"], ["b", "e"], ["c"]]);
  });

  it("places each photo in the shortest column", () => {
    const photos = [sized("tall", 600, 1200), sized("wide1", 1200, 600), sized("wide2", 1200, 600), sized("wide3", 1200, 600)];
    const ids = balanceColumns(photos, 2).map((col) => col.map((c) => c.photo.id));
    expect(ids).toEqual([["tall"], ["wide1", "wide2", "wide3"]]);
  });

  it("keeps placed photos where they are when more are appended", () => {
    const photos = Array.from({ length: 30 }, (_, i) => sized(String(i), 800, 500 + ((i * 137) % 900)));
    const before = balanceColumns(photos.slice(0, 18), 3);
    const after = balanceColumns(photos, 3);
    before.forEach((col, c) => expect(after[c].slice(0, col.length)).toEqual(col));
  });

  it("keeps the original index for lightbox navigation", () => {
    const columns = balanceColumns([sized("a", 1, 1), sized("b", 1, 1)], 2);
    expect(columns.map((col) => col[0].index)).toEqual([0, 1]);
  });
});

describe("colorBlur", () => {
  const decode = (url: string) => atob(url.replace("data:image/svg+xml;base64,", ""));

  it("builds a gradient from up to three valid colours", () => {
    const svg = decode(colorBlur(["#112233", "nope", "#445566", "#778899", "#aabbcc"]));
    expect(svg).toContain('stop-color="#112233"');
    expect(svg).toContain('stop-color="#778899"');
    expect(svg).not.toContain("#aabbcc");
    expect(svg).not.toContain("nope");
  });

  it("falls back to neutral grey", () => {
    expect(decode(colorBlur(null))).toContain("#e5e5e5");
  });
});

describe("phash helpers", () => {
  it("counts differing bits", () => {
    expect(phashDistance("0", "0")).toBe(0);
    expect(phashDistance("1", "0")).toBe(1);
    expect(phashDistance("18446744073709551615", "0")).toBe(64);
  });

  it("compares a signed hash with its unsigned form as equal", () => {
    expect(phashDistance("-1", "18446744073709551615")).toBe(0);
  });

  it("rejects values that are not hashes", () => {
    expect(isValidPhash(undefined)).toBe(false);
    expect(isValidPhash("abc")).toBe(false);
    expect(isValidPhash("1712345678901")).toBe(false);
    expect(isValidPhash("5728406318422352892")).toBe(true);
  });
});

describe("duplicate grouping", () => {
  const base = BigInt("5728406318422352892");
  const flip = (bits: number) => (base ^ ((BigInt(1) << BigInt(bits)) - BigInt(1))).toString();
  const photos = [
    { id: "a", phash: base.toString(), width: 100, height: 100 },
    { id: "b", phash: flip(2), width: 2000, height: 2000, caption: "Best copy" },
    { id: "c", phash: flip(10) },
    { id: "d", phash: "123" },
  ];

  it("finds pairs within the distance and skips invalid hashes", () => {
    const pairs = findSimilarPairs(photos, 16);
    expect(pairs.find((p) => p.a === "a" && p.b === "b")?.distance).toBe(2);
    expect(pairs.some((p) => p.a === "d" || p.b === "d")).toBe(false);
  });

  it("groups at a threshold and keeps the best copy", () => {
    const pairs = findSimilarPairs(photos);
    const [group] = groupDuplicates(photos, pairs, 3);
    expect(group.members.map((m) => m.id)).toEqual(["b", "a"]);
    expect(group.keep.id).toBe("b");
    expect(groupDuplicates(photos, pairs, 12)[0].members).toHaveLength(3);
  });

  it("accepts a custom keeper score", () => {
    const pairs = findSimilarPairs(photos);
    const [group] = groupDuplicates(photos, pairs, 3, (p) => (p.id === "a" ? 1 : 0));
    expect(group.keep.id).toBe("a");
  });
});
