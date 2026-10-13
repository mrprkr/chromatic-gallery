// @vitest-environment jsdom
// Its own file: the tile observer is shared at module level, so it must be
// created against this file's IntersectionObserver stub.
import { act, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { ChromaticGallery, type GalleryPhoto } from "../src/react";

type Notify = (entries: Partial<IntersectionObserverEntry>[]) => void;
let notifyTiles: Notify | null = null;

beforeAll(() => {
  globalThis.IntersectionObserver = class {
    constructor(callback: Notify, options?: IntersectionObserverInit) {
      // The tile observer, not the progressive-loading sentinels.
      if (options?.rootMargin === "200% 0px") notifyTiles = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

const photos: GalleryPhoto[] = [
  { id: "red", title: "Red", src: "/red.webp", colors: ["#d64545"], width: 800, height: 600 },
  { id: "blue", title: "Blue", src: "/blue.webp", colors: ["#4a78d6"], width: 800, height: 600 },
];

describe("tile loading", () => {
  it("loads a tile's image eagerly once it nears the viewport", () => {
    render(<ChromaticGallery photos={photos} hashNavigation={false} defaultView="grid" />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.every((img) => img.getAttribute("loading") === "lazy")).toBe(true);

    const red = screen.getByRole("button", { name: "Red" });
    act(() => notifyTiles?.([{ target: red, isIntersecting: true }]));
    expect(red.querySelector("img")?.getAttribute("loading")).toBe("eager");
    const blue = screen.getByRole("button", { name: "Blue" });
    expect(blue.querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });
});
