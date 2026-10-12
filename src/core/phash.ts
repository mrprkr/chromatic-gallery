/**
 * Hamming distance between two 64-bit perceptual hashes held as decimal
 * strings (the format `computePhash` from `chromatic-gallery/node` returns).
 *
 * asUintN keeps the XOR inside 64 unsigned bits, so a hash stored as a signed
 * value still compares sensibly.
 */
export function phashDistance(a: string, b: string): number {
  let xor = BigInt.asUintN(64, BigInt(a) ^ BigInt(b));
  let distance = 0;
  while (xor > BigInt(0)) {
    distance += Number(xor & BigInt(1));
    xor >>= BigInt(1);
  }
  return distance;
}

/**
 * Whether a stored value looks like a usable 64-bit hash: an integer string,
 * and not one so small it is more likely a timestamp or counter than a hash.
 *
 * Millisecond timestamps sit around 1.8e12 and stay under 2^42 (4.4e12) until
 * the year 2109. A real hash falls that low about once in four million.
 */
export function isValidPhash(value: string | undefined | null): value is string {
  if (!value || !/^-?\d+$/.test(value)) return false;
  return BigInt.asUintN(64, BigInt(value)) >= BigInt(2) ** BigInt(42);
}
