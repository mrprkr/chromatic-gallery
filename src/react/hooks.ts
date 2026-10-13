import { useCallback, useRef, useState, useSyncExternalStore, type RefCallback } from "react";
import type { ViewMode } from "../core/types";

/**
 * Viewport-derived values go through useSyncExternalStore rather than reading
 * `window` in a state initialiser. Reading the viewport while rendering makes
 * the server pick one layout and the client another, which React rejects as a
 * hydration mismatch. With an explicit server snapshot React renders that
 * during hydration and swaps in the real value straight after.
 */
function subscribeToViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function readColumnCount() {
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
}

const serverColumnCount = () => 1;

export function useColumnCount() {
  return useSyncExternalStore(subscribeToViewport, readColumnCount, serverColumnCount);
}

/**
 * The view follows the viewport (grid on phones, columns elsewhere) until the
 * viewer picks one; after that their choice sticks.
 */
export function useViewMode(
  available: readonly ViewMode[],
  defaultView?: ViewMode
): [ViewMode, (m: ViewMode) => void] {
  const fallback = available[0] ?? "grid";
  const pickAvailable = (preferred: ViewMode) =>
    available.includes(preferred) ? preferred : fallback;

  const responsive = useSyncExternalStore(
    subscribeToViewport,
    () => pickAvailable(defaultView ?? (window.innerWidth < 768 ? "grid" : "masonry")),
    () => pickAvailable(defaultView ?? "masonry")
  );
  const [chosen, setChosen] = useState<ViewMode | null>(null);
  return [chosen && available.includes(chosen) ? chosen : responsive, setChosen];
}

const emptySubscribe = () => () => {};

/** False during SSR and hydration, true after. */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * The URL hash is the single source of truth for which photo the lightbox
 * shows, so a deep link, a back/forward step and an in-app open all go through
 * one path. `pushState` and `replaceState` don't fire `popstate`, so the
 * gallery calls `notifyHashChange()` after changing the hash itself.
 */
const hashListeners = new Set<() => void>();

function notifyHashChange() {
  for (const listener of hashListeners) listener();
}

function subscribeToHash(onChange: () => void) {
  hashListeners.add(onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    hashListeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

function readHashId() {
  try {
    return decodeURIComponent(window.location.hash.slice(1)) || null;
  } catch {
    // A malformed escape in someone else's anchor is not a photo id.
    return null;
  }
}

const serverHashId = () => null;

/**
 * Which photo the lightbox shows, held in the URL hash (deep-linkable, works
 * with the back button) or, with `hashNavigation` off, in component state.
 */
export function useSelection(hashNavigation: boolean) {
  const hashId = useSyncExternalStore(subscribeToHash, readHashId, serverHashId);
  const [stateId, setStateId] = useState<string | null>(null);
  const selectedId = hashNavigation ? hashId : stateId;

  /** `replace` steps between photos without stacking history entries. */
  const select = useCallback(
    (id: string | null, replace = false) => {
      if (!hashNavigation) {
        setStateId(id);
        return;
      }
      const url =
        id === null
          ? window.location.pathname + window.location.search
          : `#${encodeURIComponent(id)}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      notifyHashChange();
    },
    [hashNavigation]
  );

  return [selectedId, select] as const;
}

/**
 * How far ahead of the viewport a tile starts loading its image: two screens.
 * Native `loading="lazy"` waits until an image is almost on screen in Safari
 * and Firefox, so tiles scrolled into view at speed sat empty while they
 * downloaded.
 */
export const IMAGE_LOAD_MARGIN = "200% 0px";

/**
 * One observer shared by every tile, rather than one per tile, so a gallery of
 * hundreds of photos does not create hundreds of observers.
 */
let sharedObserver: IntersectionObserver | null = null;
const nearCallbacks = new Map<Element, () => void>();

function observeNear(el: Element, onNear: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    onNear();
    return () => {};
  }
  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = nearCallbacks.get(entry.target);
        nearCallbacks.delete(entry.target);
        sharedObserver?.unobserve(entry.target);
        callback?.();
      }
    },
    { rootMargin: IMAGE_LOAD_MARGIN }
  );
  nearCallbacks.set(el, onNear);
  sharedObserver.observe(el);
  return () => {
    nearCallbacks.delete(el);
    sharedObserver?.unobserve(el);
  };
}

/**
 * True once the element has come within `IMAGE_LOAD_MARGIN` of the viewport.
 * It stays true, so an image that started loading is never cancelled.
 */
export function useNearViewport<T extends Element>(): [RefCallback<T>, boolean] {
  const [near, setNear] = useState(false);
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (el) cleanup.current = observeNear(el, () => setNear(true));
  }, []);
  return [ref, near];
}
