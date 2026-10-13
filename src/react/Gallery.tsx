import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  balanceColumns,
  groupByMonth,
  shuffleWithinChromaticOrder,
  sortChromatically,
  type TimelineGroup,
} from "../core/arrange";
import { hueFamily } from "../core/hue";
import type { GalleryPhoto, ViewMode } from "../core/types";
import { Controls, type CategoryOption } from "./Controls";
import { useColumnCount, useMounted, useSelection, useViewMode } from "./hooks";
import { plainImage, type ImageAdapter } from "./image";
import { mergeLabels, type DeepPartialLabels, type GalleryLabels } from "./labels";
import { Lightbox } from "./Lightbox";
import { PhotoTile } from "./PhotoTile";
import type { ToneValue } from "./tones";

const ALL_VIEWS: readonly ViewMode[] = ["grid", "masonry", "timeline"];

/**
 * How far ahead of the viewport the next batch mounts. Wider than the image
 * load margin (two screens), so tiles exist before they need to start loading.
 */
const MOUNT_MARGIN = "300% 0px";

export interface ChromaticGalleryProps {
  photos: readonly GalleryPhoto[];
  /**
   * Options for the tag filter. Defaults to every distinct `category` in
   * `photos`, title-cased. Pass `[]` to hide the filter.
   */
  categories?: CategoryOption[];
  /** Show the tone (colour) filter. Defaults to true. */
  tones?: boolean;
  /** Which views to offer, in order. Defaults to all three. */
  views?: readonly ViewMode[];
  /** Starting view. Defaults to grid on phones and columns elsewhere. */
  defaultView?: ViewMode;
  /**
   * `chromatic` (the default) orders photos round the colour wheel by their
   * first `colors` entry. `given` keeps the order you pass in.
   */
  order?: "chromatic" | "given";
  /**
   * Shuffle photos within their colour bands after mount, and show a shuffle
   * button. Defaults to true.
   */
  shuffle?: boolean;
  /** Keep the open photo in the URL hash, so it can be linked to. Defaults to true. */
  hashNavigation?: boolean;
  /** Renders images. Defaults to a plain `<img>`; use `nextImage` from `chromatic-gallery/next` in Next.js. */
  image?: ImageAdapter;
  /** Override any of the text the gallery renders. */
  labels?: DeepPartialLabels;
  /** Locale for timeline month headings. Defaults to `en-GB`. */
  locale?: string;
  /** Photos mounted on first paint. More mount as the viewer scrolls. Defaults to 36. */
  initialCount?: number;
  /** Photos mounted per scroll step. Defaults to 24. */
  batchSize?: number;
  /** Called when the lightbox opens on a photo, or closes (`null`). */
  onSelect?: (photo: GalleryPhoto | null) => void;
  /**
   * `auto` (the default) follows `prefers-color-scheme`, overridden by a
   * `.dark`/`.light` class or `data-theme` attribute on an ancestor. `class`
   * is light unless an ancestor has `.dark` or `data-theme="dark"`, for sites
   * that toggle dark mode with a class.
   */
  colorScheme?: "auto" | "class" | "light" | "dark";
  className?: string;
  style?: CSSProperties;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveCategories(photos: readonly GalleryPhoto[]): CategoryOption[] {
  const values = new Set<string>();
  for (const photo of photos) if (photo.category) values.add(photo.category);
  return [...values].sort().map((value) => ({ value, label: titleCase(value) }));
}

export function ChromaticGallery({
  photos,
  categories: categoriesProp,
  tones = true,
  views = ALL_VIEWS,
  defaultView,
  order = "chromatic",
  shuffle = true,
  hashNavigation = true,
  image = plainImage,
  labels: labelOverrides,
  locale = "en-GB",
  initialCount = 36,
  batchSize = 24,
  onSelect,
  colorScheme = "auto",
  className,
  style,
}: ChromaticGalleryProps) {
  const labels: GalleryLabels = useMemo(() => mergeLabels(labelOverrides), [labelOverrides]);
  const [selectedId, select] = useSelection(hashNavigation);
  const [viewMode, setViewMode] = useViewMode(views, defaultView);
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedTone, setSelectedTone] = useState<ToneValue>("all");
  const columnCount = useColumnCount();
  const mounted = useMounted();

  // Bumped each time the viewer shuffles, re-rolling the arrangement.
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const categories = useMemo(
    () => categoriesProp ?? deriveCategories(photos),
    [categoriesProp, photos]
  );
  const categoryLabels = useMemo(
    () => new Map(categories.map((c) => [c.value, c.label])),
    [categories]
  );
  const categoryLabel = (photo: GalleryPhoto) =>
    photo.category ? (categoryLabels.get(photo.category) ?? photo.category) : undefined;

  const sortedPhotos = useMemo(
    () => (order === "chromatic" ? sortChromatically(photos) : [...photos]),
    [photos, order]
  );

  // Shuffling uses Math.random(), which would differ between the server render
  // and the first client render and break hydration. So the deterministic order
  // holds until after mount, then the client shuffles.
  const arrangedPhotos = useMemo(
    () => (shuffle && mounted ? shuffleWithinChromaticOrder(sortedPhotos) : sortedPhotos),
    // shuffleSeed intentionally drives a fresh shuffle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedPhotos, shuffle, mounted, shuffleSeed]
  );

  const filteredPhotos = useMemo(
    () =>
      arrangedPhotos.filter(
        (p) =>
          (selectedTag === "all" || p.category === selectedTag) &&
          (selectedTone === "all" || hueFamily(p.colors?.[0]) === selectedTone)
      ),
    [arrangedPhotos, selectedTag, selectedTone]
  );

  // The full on-screen order: drives lightbox navigation and hash lookup.
  // Timeline re-sorts by date, so it has its own flattened order.
  const orderedPhotos = useMemo(
    () =>
      viewMode === "timeline"
        ? groupByMonth(filteredPhotos, { locale, undatedLabel: labels.undated }).flatMap((g) => g.photos)
        : filteredPhotos,
    [viewMode, filteredPhotos, locale, labels.undated]
  );

  // The lightbox tracks the photo by id, not position, so the open image stays
  // the same one when the order changes underneath it.
  const selectedIndex = useMemo(() => {
    if (selectedId === null) return null;
    const i = orderedPhotos.findIndex((p) => p.id === selectedId);
    return i === -1 ? null : i;
  }, [orderedPhotos, selectedId]);

  // Progressive rendering: only a window of photos is mounted, so hundreds of
  // images are never decoded at once (iOS Safari kills the tab when they are).
  // The window is keyed by the arrangement it belongs to, so it collapses back
  // to the first batch during render when the arrangement changes.
  const windowKey = `${selectedTag}|${selectedTone}|${viewMode}|${shuffleSeed}`;
  const [loadWindow, setLoadWindow] = useState({ key: windowKey, count: initialCount });
  const scrolledCount = loadWindow.key === windowKey ? loadWindow.count : initialCount;

  // Grow the window past a deep-linked photo so its tile exists when the
  // lightbox closes.
  const visibleCount =
    selectedIndex !== null && selectedIndex >= scrolledCount
      ? Math.min(orderedPhotos.length, selectedIndex + batchSize)
      : scrolledCount;

  const visiblePhotos = useMemo(() => orderedPhotos.slice(0, visibleCount), [orderedPhotos, visibleCount]);
  const hasMore = visibleCount < orderedPhotos.length;

  const timelineGroups = useMemo(
    () => groupByMonth(visiblePhotos, { locale, undatedLabel: labels.undated }),
    [visiblePhotos, locale, labels.undated]
  );

  // Columns end at different heights, so each one gets its own sentinel: the
  // next batch mounts as soon as the shortest column nears the viewport, not
  // when the tallest does, which left the shorter columns empty for a while.
  const rootRef = useRef<HTMLDivElement>(null);
  const columnLayout = viewMode === "masonry" && columnCount > 1;
  useEffect(() => {
    if (!hasMore) return;
    const sentinels = rootRef.current?.querySelectorAll("[data-cg-sentinel]");
    if (!sentinels?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoadWindow({
            key: windowKey,
            count: Math.min(visibleCount + batchSize, orderedPhotos.length),
          });
        }
      },
      { rootMargin: MOUNT_MARGIN }
    );
    sentinels.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [hasMore, orderedPhotos.length, visibleCount, windowKey, batchSize, columnLayout, columnCount]);

  const selectedPhoto = selectedIndex !== null ? orderedPhotos[selectedIndex] : null;

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });
  useEffect(() => {
    onSelectRef.current?.(selectedPhoto);
  }, [selectedPhoto]);

  const openLightbox = (index: number) => {
    const photo = orderedPhotos[index];
    if (photo) select(photo.id);
  };

  const closeLightbox = useCallback(() => {
    if (selectedId !== null) select(null);
  }, [selectedId, select]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (selectedIndex === null || orderedPhotos.length === 0) return;
      const target = orderedPhotos[(selectedIndex + dir + orderedPhotos.length) % orderedPhotos.length];
      if (target) select(target.id, true);
    },
    [selectedIndex, orderedPhotos, select]
  );
  const goToPrevious = useCallback(() => step(-1), [step]);
  const goToNext = useCallback(() => step(1), [step]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") goToPrevious();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, goToPrevious, goToNext, closeLightbox]);

  // Lock page scroll while the lightbox is open, restoring whatever was set before.
  const lightboxOpen = selectedIndex !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lightboxOpen]);

  const count = orderedPhotos.length;
  const prevPhoto =
    selectedIndex !== null && count > 1 ? orderedPhotos[(selectedIndex - 1 + count) % count] : null;
  const nextPhoto =
    selectedIndex !== null && count > 1 ? orderedPhotos[(selectedIndex + 1) % count] : null;

  const tile = (photo: GalleryPhoto, layout: "grid" | "masonry" | "bento", index: number, extra?: string) => (
    <PhotoTile
      key={photo.id}
      photo={photo}
      layout={layout}
      categoryLabel={categoryLabel(photo)}
      onClick={() => openLightbox(index)}
      image={image}
      className={extra}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`cg-root${className ? ` ${className}` : ""}`}
      data-color-scheme={colorScheme}
      style={style}
    >
      <Controls
        views={views}
        viewMode={viewMode}
        setViewMode={(m) => {
          setViewMode(m);
          closeLightbox();
        }}
        categories={categories}
        selectedTag={selectedTag}
        setSelectedTag={(t) => {
          setSelectedTag(t);
          closeLightbox();
        }}
        showTones={tones}
        selectedTone={selectedTone}
        setSelectedTone={(t) => {
          setSelectedTone(t);
          closeLightbox();
        }}
        onShuffle={
          shuffle
            ? () => {
                setShuffleSeed((s) => s + 1);
                closeLightbox();
              }
            : undefined
        }
        labels={labels}
      />

      <div className="cg-divider" />

      {orderedPhotos.length === 0 ? (
        <p className="cg-empty">{labels.empty}</p>
      ) : viewMode === "grid" ? (
        <div className="cg-grid">{visiblePhotos.map((p, i) => tile(p, "grid", i))}</div>
      ) : viewMode === "masonry" ? (
        columnCount === 1 ? (
          <BentoGrid photos={visiblePhotos} tile={tile} />
        ) : (
          <MasonryColumns photos={visiblePhotos} columnCount={columnCount} tile={tile} hasMore={hasMore} />
        )
      ) : (
        <Timeline groups={timelineGroups} tile={tile} />
      )}

      {hasMore && !columnLayout && <div aria-hidden data-cg-sentinel className="cg-sentinel" />}

      {selectedPhoto && (
        <Lightbox
          photo={selectedPhoto}
          prevPhoto={prevPhoto}
          nextPhoto={nextPhoto}
          categoryLabel={categoryLabel(selectedPhoto)}
          close={closeLightbox}
          prev={goToPrevious}
          next={goToNext}
          image={image}
          labels={labels}
        />
      )}
    </div>
  );
}

type RenderTile = (
  photo: GalleryPhoto,
  layout: "grid" | "masonry" | "bento",
  index: number,
  extra?: string
) => ReactNode;

function MasonryColumns({
  photos,
  columnCount,
  tile,
  hasMore,
}: {
  photos: GalleryPhoto[];
  columnCount: number;
  tile: RenderTile;
  hasMore: boolean;
}) {
  // Each photo goes to the shortest column, so the columns end close together
  // instead of drifting apart as more photos mount.
  const columns = balanceColumns(photos, columnCount);

  return (
    <div className="cg-columns">
      {columns.map((col, i) => (
        <div key={i} className="cg-column">
          {col.map(({ photo, index }) => tile(photo, "masonry", index))}
          {hasMore && <div aria-hidden data-cg-sentinel className="cg-column-sentinel" />}
        </div>
      ))}
    </div>
  );
}

/**
 * Deterministic bento rhythm for the two-column phone layout: occasional tall
 * and wide tiles among squares. Dense packing backfills any holes the larger
 * tiles leave, so the grid stays gapless whatever the photo count.
 */
function bentoSpan(i: number): string | undefined {
  const m = i % 6;
  if (m === 0 || m === 4) return "cg-span-tall";
  if (m === 2) return "cg-span-wide";
  return undefined;
}

function BentoGrid({ photos, tile }: { photos: GalleryPhoto[]; tile: RenderTile }) {
  return (
    <div className="cg-bento-wrap">
      <div className="cg-bento">{photos.map((p, i) => tile(p, "bento", i, bentoSpan(i)))}</div>
    </div>
  );
}

function Timeline({ groups, tile }: { groups: TimelineGroup<GalleryPhoto>[]; tile: RenderTile }) {
  // A running index across groups keeps lightbox navigation in step with the
  // flattened order in the parent.
  let runningIndex = 0;
  return (
    <div className="cg-timeline">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="cg-timeline-head">
            <h2>{group.label}</h2>
            <span>{group.photos.length}</span>
            <div className="cg-rule" />
          </div>
          <div className="cg-grid">{group.photos.map((p) => tile(p, "grid", runningIndex++))}</div>
        </section>
      ))}
    </div>
  );
}
