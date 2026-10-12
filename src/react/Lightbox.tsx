import { useCallback, useEffect, useId, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import type { GalleryPhoto } from "../core/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PinIcon } from "./icons";
import type { ImageAdapter } from "./image";
import type { GalleryLabels } from "./labels";

const SWIPE_THRESHOLD = 50;

// The lightbox image variant. Preloading must request exactly this, so the
// browser reuses the bytes when the viewer steps to that photo.
const LIGHTBOX_SIZES = "100vw";
const LIGHTBOX_QUALITY = 95;

export function Lightbox({
  photo,
  prevPhoto,
  nextPhoto,
  categoryLabel,
  close,
  prev,
  next,
  image,
  labels,
}: {
  photo: GalleryPhoto;
  prevPhoto: GalleryPhoto | null;
  nextPhoto: GalleryPhoto | null;
  categoryLabel?: string;
  close: () => void;
  prev: () => void;
  next: () => void;
  image: ImageAdapter;
  labels: GalleryLabels;
}) {
  const titleId = useId();
  const { Image, preload } = image;

  // Preload the neighbours so stepping forward or back paints at once.
  useEffect(() => {
    for (const p of [prevPhoto, nextPhoto]) {
      if (p?.src) preload?.(p.src, { sizes: LIGHTBOX_SIZES, quality: LIGHTBOX_QUALITY });
    }
  }, [prevPhoto, nextPhoto, preload]);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const touchDeltaY = useRef(0);
  const swipeDirection = useRef<"horizontal" | "vertical" | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDownOffset, setSwipeDownOffset] = useState(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    swipeDirection.current = null;
    setSwipeOffset(0);
    setSwipeDownOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Lock direction on the first significant movement
    if (swipeDirection.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeDirection.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }

    if (swipeDirection.current === "horizontal") {
      touchDeltaX.current = dx;
      setSwipeOffset(dx);
    } else if (swipeDirection.current === "vertical" && dy > 0) {
      touchDeltaY.current = dy;
      setSwipeDownOffset(dy);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeDirection.current === "horizontal" && Math.abs(touchDeltaX.current) > SWIPE_THRESHOLD) {
      if (touchDeltaX.current > 0) prev();
      else next();
    } else if (swipeDirection.current === "vertical" && touchDeltaY.current > SWIPE_THRESHOLD) {
      close();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    swipeDirection.current = null;
    setSwipeOffset(0);
    setSwipeDownOffset(0);
  }, [prev, next, close]);

  const swiping = swipeOffset !== 0 || swipeDownOffset !== 0;
  const travel = swipeDownOffset > 0 ? swipeDownOffset : swipeOffset;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="cg-lightbox"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" aria-label={labels.closeBackdrop} className="cg-lb-backdrop" onClick={close} />

      <button type="button" onClick={close} className="cg-lb-close" aria-label={labels.closeLightbox}>
        <CloseIcon className="cg-lb-close-icon" />
      </button>

      <nav className="cg-lb-nav" aria-label={labels.photoNavigation}>
        <button type="button" onClick={prev} className="cg-lb-step" aria-label={labels.previous}>
          <ChevronLeftIcon className="cg-lb-step-icon" />
        </button>
        <button type="button" onClick={next} className="cg-lb-step" aria-label={labels.next}>
          <ChevronRightIcon className="cg-lb-step-icon" />
        </button>
      </nav>

      <div className="cg-lb-stage">
        <div
          key={photo.id}
          className="cg-lb-photo"
          style={
            swiping
              ? {
                  transform:
                    swipeDownOffset > 0
                      ? `translateY(${swipeDownOffset}px) scale(${Math.max(0.9, 1 - swipeDownOffset / 800)})`
                      : `translateX(${swipeOffset}px)`,
                  opacity: Math.max(0.3, 1 - Math.abs(travel) / 400),
                  transition: "none",
                }
              : undefined
          }
        >
          {photo.src ? (
            <Image
              src={photo.src}
              alt={photo.caption || photo.title}
              fill
              sizes={LIGHTBOX_SIZES}
              quality={LIGHTBOX_QUALITY}
              priority
              draggable={false}
              blurDataURL={photo.blurDataURL}
              className="cg-lb-img"
            />
          ) : (
            <div className="cg-lb-letter">
              <span>{photo.title.charAt(0)}</span>
            </div>
          )}
        </div>
      </div>

      <h2 id={titleId} className="cg-sr-only">
        {photo.title}
      </h2>

      {(categoryLabel || photo.location) && (
        <aside className="cg-lb-inspector">
          <p className="cg-lb-category">{categoryLabel ?? labels.photo}</p>
          {photo.location && (
            <p className="cg-lb-location">
              <PinIcon className="cg-lb-pin" />
              <span>{photo.location}</span>
            </p>
          )}
        </aside>
      )}
    </div>
  );

  return createPortal(dialog, document.body);
}
