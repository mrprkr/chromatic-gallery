import { isValidPhash, phashDistance } from "./phash";

/**
 * Grouping near-duplicate photos by perceptual hash. Pure, so the same code
 * can run on the server and in a review UI.
 */

export interface DuplicateCandidate {
  id: string;
  phash?: string | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  location?: string | null;
  date?: string | null;
  colors?: readonly string[] | null;
}

export interface SimilarPair {
  a: string;
  b: string;
  distance: number;
}

export interface DuplicateGroup<T extends DuplicateCandidate> {
  /** Stable id for keys and selection state: the keeper's id. */
  id: string;
  /** The member worth keeping, by the `score` function. */
  keep: T;
  /** Every member, keeper first, the rest ordered by distance from it. */
  members: T[];
  /** Distance from the keeper to each other member, by id. */
  distances: Record<string, number>;
  /** Smallest and largest distance found inside the group. */
  closest: number;
  furthest: number;
}

/** Hashes within this Hamming distance are near-certain duplicates. */
export const DUPLICATE_THRESHOLD_DEFAULT = 3;

/**
 * Widest distance worth scanning. Past roughly a quarter of the 64 bits the
 * matches are "same sort of scene", not "same photo".
 */
export const DUPLICATE_THRESHOLD_MAX = 16;

/**
 * All pairs within `maxDistance` of each other.
 *
 * Compute once at the widest threshold, then regroup at any tighter one with
 * `groupDuplicates` without redoing the O(n^2) scan. Photos with a missing or
 * invalid hash are skipped.
 */
export function findSimilarPairs<T extends DuplicateCandidate>(
  photos: readonly T[],
  maxDistance: number = DUPLICATE_THRESHOLD_MAX
): SimilarPair[] {
  const hashed = photos.filter((p) => isValidPhash(p.phash));
  const pairs: SimilarPair[] = [];

  for (let i = 0; i < hashed.length; i++) {
    for (let j = i + 1; j < hashed.length; j++) {
      const distance = phashDistance(hashed[i].phash!, hashed[j].phash!);
      if (distance <= maxDistance) {
        pairs.push({ a: hashed[i].id, b: hashed[j].id, distance });
      }
    }
  }

  return pairs;
}

/** Union-find over the pairs at or under `threshold`. */
function cluster(pairs: readonly SimilarPair[], threshold: number): Map<string, string[]> {
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    let root = parent.get(id) ?? id;
    if (root !== id) {
      root = find(root);
      parent.set(id, root);
    }
    return root;
  };

  for (const pair of pairs) {
    if (pair.distance > threshold) continue;
    parent.set(pair.a, parent.get(pair.a) ?? pair.a);
    parent.set(pair.b, parent.get(pair.b) ?? pair.b);
    const rootA = find(pair.a);
    const rootB = find(pair.b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  const clusters = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    const members = clusters.get(root);
    if (members) members.push(id);
    else clusters.set(root, [id]);
  }

  return clusters;
}

/**
 * Default keeper score: the biggest image wins, then the richest metadata,
 * since a re-upload is usually the one missing its caption and location.
 */
export function defaultKeeperScore(photo: DuplicateCandidate): number {
  let score = ((photo.width ?? 0) * (photo.height ?? 0)) / 1000;
  if (photo.caption) score += 300;
  if (photo.location) score += 200;
  if (photo.date) score += 100;
  if (photo.colors && photo.colors.length > 0) score += 50;
  return score;
}

/** The member worth keeping. Ties break on id so the pick is stable. */
export function suggestKeeper<T extends DuplicateCandidate>(
  members: readonly T[],
  score: (photo: T) => number = defaultKeeperScore
): T {
  return [...members].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  })[0];
}

/**
 * Group photos into duplicate sets at the given threshold, tightest first, so
 * the sets most likely to be genuine duplicates sit at the top.
 */
export function groupDuplicates<T extends DuplicateCandidate>(
  photos: readonly T[],
  pairs: readonly SimilarPair[],
  threshold: number = DUPLICATE_THRESHOLD_DEFAULT,
  score: (photo: T) => number = defaultKeeperScore
): DuplicateGroup<T>[] {
  const byId = new Map(photos.map((p) => [p.id, p]));
  const groups: DuplicateGroup<T>[] = [];

  for (const ids of cluster(pairs, threshold).values()) {
    const members = ids.map((id) => byId.get(id)).filter((p): p is T => p !== undefined);
    if (members.length < 2) continue;

    const keep = suggestKeeper(members, score);
    const distances: Record<string, number> = {};
    for (const member of members) {
      distances[member.id] = member.id === keep.id ? 0 : phashDistance(keep.phash!, member.phash!);
    }

    const others = members
      .filter((m) => m.id !== keep.id)
      .sort((a, b) => distances[a.id] - distances[b.id]);

    // Spread is measured across the whole group, not just against the keeper:
    // a chain of near-matches can hold two members further apart than the
    // threshold, and that is worth showing before anything is deleted.
    let closest = Infinity;
    let furthest = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const distance = phashDistance(members[i].phash!, members[j].phash!);
        if (distance < closest) closest = distance;
        if (distance > furthest) furthest = distance;
      }
    }

    groups.push({
      id: keep.id,
      keep,
      members: [keep, ...others],
      distances,
      closest: closest === Infinity ? 0 : closest,
      furthest,
    });
  }

  return groups.sort((a, b) => {
    if (a.closest !== b.closest) return a.closest - b.closest;
    if (a.members.length !== b.members.length) return b.members.length - a.members.length;
    return a.id.localeCompare(b.id);
  });
}
