import type { Sharp } from "sharp";

/**
 * 64-bit difference hash (dHash) of an image, as an unsigned decimal string.
 *
 * Resizes to 9x8 greyscale and compares each pixel with its right-hand
 * neighbour, giving 8 bits per row. Compare two hashes with `phashDistance`
 * from `chromatic-gallery/core`.
 */
export async function computePhash(image: Sharp): Promise<string> {
  const { data } = await image
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  let hashHigh = 0; // bits 32-63
  let hashLow = 0; // bits 0-31
  let bit = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (pixels[row * 9 + col] < pixels[row * 9 + col + 1]) {
        if (bit < 32) hashLow |= 1 << bit;
        else hashHigh |= 1 << (bit - 32);
      }
      bit++;
    }
  }

  // Bitwise operators work on signed 32-bit integers, so both halves are read
  // back unsigned; otherwise a set top bit yields a negative hash.
  const value = (BigInt(hashHigh >>> 0) << BigInt(32)) | BigInt(hashLow >>> 0);
  return value.toString();
}
