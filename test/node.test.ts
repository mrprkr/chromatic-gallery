import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { phashDistance } from "../src/core";
import { analysePhoto, computePhash, extractDominantColors } from "../src/node";

function solid(width: number, height: number, background: string) {
  return sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();
}

/** Left half one colour, right half another. */
async function split(left: string, right: string) {
  const half = await solid(50, 100, right);
  return sharp({ create: { width: 100, height: 100, channels: 3, background: left } })
    .composite([{ input: half, left: 50, top: 0 }])
    .png()
    .toBuffer();
}

describe("extractDominantColors", () => {
  it("returns the most populous cluster first", () => {
    // Centres seed from evenly spaced pixels, so each colour must sit at one.
    const blue = [...Array(8)].flatMap(() => [0, 0, 255]);
    const red = [...Array(16)].flatMap(() => [255, 0, 0]);
    expect(extractDominantColors(new Uint8Array([...blue, ...red]), 2)).toEqual(["#ff0000", "#0000ff"]);
  });

  it("is deterministic", () => {
    const pixels = Uint8Array.from({ length: 300 }, (_, i) => (i * 37) % 256);
    expect(extractDominantColors(pixels)).toEqual(extractDominantColors(pixels));
  });
});

describe("computePhash", () => {
  it("gives identical images identical hashes and different images distant ones", async () => {
    const a = await computePhash(sharp(await split("#000000", "#ffffff")));
    const b = await computePhash(sharp(await split("#000000", "#ffffff")));
    const c = await computePhash(sharp(await split("#ffffff", "#000000")));
    expect(phashDistance(a, b)).toBe(0);
    expect(phashDistance(a, c)).toBeGreaterThan(4);
  });
});

describe("analysePhoto", () => {
  it("reports size, colours, hash and placeholder", async () => {
    const result = await analysePhoto(await solid(120, 80, "#4a78d6"));
    expect(result.width).toBe(120);
    expect(result.height).toBe(80);
    expect(result.colors[0]).toBe("#4a78d6");
    expect(result.phash).toMatch(/^\d+$/);
    expect(result.blurDataURL).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("swaps sides for a quarter-turn EXIF orientation", async () => {
    const rotated = await sharp(await solid(120, 80, "#d64545")).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const result = await analysePhoto(rotated);
    expect([result.width, result.height]).toEqual([80, 120]);
  });
});
