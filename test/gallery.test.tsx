// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ChromaticGallery, type GalleryPhoto } from "../src/react";

beforeAll(() => {
  // jsdom lacks IntersectionObserver, which progressive loading uses.
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const photos: GalleryPhoto[] = [
  { id: "red", title: "Red", src: "/red.webp", category: "street", colors: ["#d64545"], width: 800, height: 600 },
  { id: "blue", title: "Blue", src: "/blue.webp", category: "nature", colors: ["#4a78d6"], width: 800, height: 600, location: "Lisbon" },
  { id: "grey", title: "Grey", src: "/grey.webp", category: "other", colors: ["#9ca3af"], width: 800, height: 600 },
];

describe("ChromaticGallery", () => {
  it("renders on the server", () => {
    const html = renderToString(<ChromaticGallery photos={photos} />);
    expect(html).toContain("cg-root");
    expect(html.match(/<img/g)).toHaveLength(3);
  });

  it("renders a tile per photo with the default <img>", () => {
    render(<ChromaticGallery photos={photos} hashNavigation={false} />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("opens and closes the lightbox", () => {
    render(<ChromaticGallery photos={photos} hashNavigation={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Lisbon")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the open photo in the URL hash and steps with the arrow keys", () => {
    render(<ChromaticGallery photos={photos} order="given" shuffle={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Red" }));
    expect(window.location.hash).toBe("#red");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(window.location.hash).toBe("#blue");
  });

  it("opens from a deep link", () => {
    window.history.replaceState(null, "", "/#grey");
    render(<ChromaticGallery photos={photos} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("filters by derived category", () => {
    render(<ChromaticGallery photos={photos} hashNavigation={false} defaultView="grid" />);
    // Both the desktop and phone filter UIs are in the DOM; CSS hides one.
    fireEvent.click(screen.getAllByRole("button", { name: /All tags/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Nature" }));
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("uses a custom image adapter", () => {
    render(
      <ChromaticGallery
        photos={photos}
        hashNavigation={false}
        image={{ Image: (p) => <img data-testid="custom" src={p.src} alt={p.alt} /> }}
      />
    );
    expect(screen.getAllByTestId("custom")).toHaveLength(3);
  });

  it("hides the tag filter when given no categories", () => {
    render(<ChromaticGallery photos={photos} categories={[]} hashNavigation={false} />);
    expect(screen.queryByRole("button", { name: /All tags/ })).toBeNull();
  });

  it("reports selection changes", async () => {
    const seen: (string | null)[] = [];
    render(
      <ChromaticGallery photos={photos} hashNavigation={false} onSelect={(p) => seen.push(p?.id ?? null)} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Red" }));
    });
    expect(seen).toEqual([null, "red"]);
  });
});
