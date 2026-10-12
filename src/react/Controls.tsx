import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ViewMode } from "../core/types";
import {
  BentoIcon,
  CheckIcon,
  ChevronDownIcon,
  EllipsisLoader,
  FilterIcon,
  GridIcon,
  ShuffleIcon,
  TimelineIcon,
} from "./icons";
import type { GalleryLabels } from "./labels";
import { HUE_TONES, NEUTRAL_SWATCH, swatchStyle, toneSwatch, WHEEL_GRADIENT, type ToneValue } from "./tones";

export interface CategoryOption {
  label: string;
  value: string;
}

const VIEW_ICONS: Record<ViewMode, typeof GridIcon> = {
  grid: GridIcon,
  masonry: BentoIcon,
  timeline: TimelineIcon,
};

function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

/**
 * A round swatch. Uses an inset shadow rather than a border so the gradient
 * fills cleanly to the edge.
 */
function ToneSwatch({ swatch, size }: { swatch: string | null; size: "sm" | "md" | "lg" }) {
  return <span className={`cg-swatch cg-swatch-${size}`} style={swatchStyle(swatch)} />;
}

/** Lightweight popover: toggles on its trigger, closes on outside click or Escape. */
function Popover({
  renderTrigger,
  children,
  wide,
}: {
  renderTrigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="cg-popover">
      {renderTrigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={cx("cg-popover-panel", wide && "cg-popover-panel-wide")}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function TagOptions({
  categories,
  selected,
  onSelect,
  labels,
}: {
  categories: CategoryOption[];
  selected: string;
  onSelect: (v: string) => void;
  labels: GalleryLabels;
}) {
  const options = [{ label: labels.all, value: "all" }, ...categories];
  return (
    <div className="cg-options">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={cx("cg-option", selected === option.value && "is-active")}
          aria-pressed={selected === option.value}
        >
          <span>{option.label}</span>
          {selected === option.value && <CheckIcon className="cg-icon-sm" />}
        </button>
      ))}
    </div>
  );
}

const WHEEL_SIZE = 184;
const WHEEL_RING = 30;

/**
 * Colour wheel for tone filtering. Drag or tap round the ring to sweep through
 * hues and watch the gallery recolour live. The centre well shows the current
 * pick and clears the filter when tapped; a neutral chip covers the greys that
 * have no place on the wheel.
 */
function ToneWheel({
  selected,
  onSelect,
  labels,
}: {
  selected: ToneValue;
  onSelect: (v: ToneValue) => void;
  labels: GalleryLabels;
}) {
  const radius = WHEEL_SIZE / 2 - WHEEL_RING / 2;
  const hole = WHEEL_SIZE / 2 - WHEEL_RING;
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const selIndex = HUE_TONES.findIndex((t) => t.value === selected);
  const currentLabel = selected === "all" ? labels.all : labels.tones[selected];
  const currentSwatch = toneSwatch(selected);

  // Inside the well clears the filter; otherwise the angle from the top picks
  // one of the six 60° hue wedges.
  const pick = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < hole) {
      onSelect("all");
      return;
    }
    const angle = (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;
    onSelect(HUE_TONES[Math.floor(((angle + 30) % 360) / 60)].value);
  };

  const cycle = (dir: number) => {
    const start = selIndex < 0 ? (dir > 0 ? -1 : 0) : selIndex;
    const next = (start + dir + HUE_TONES.length) % HUE_TONES.length;
    onSelect(HUE_TONES[next].value);
  };

  const knob =
    selIndex >= 0
      ? {
          left: WHEEL_SIZE / 2 + radius * Math.sin((selIndex * 60 * Math.PI) / 180),
          top: WHEEL_SIZE / 2 - radius * Math.cos((selIndex * 60 * Math.PI) / 180),
        }
      : null;

  return (
    <div className="cg-wheel-wrap">
      <div
        ref={wheelRef}
        role="slider"
        tabIndex={0}
        aria-label={labels.filterByTone}
        aria-valuemin={0}
        aria-valuemax={HUE_TONES.length}
        aria-valuenow={selIndex >= 0 ? selIndex + 1 : 0}
        aria-valuetext={currentLabel}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          pick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) pick(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            cycle(1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            cycle(-1);
          } else if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            onSelect("all");
          }
        }}
        className="cg-wheel"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      >
        <div
          className={cx("cg-wheel-ring", dragging && "is-dragging")}
          style={{ background: WHEEL_GRADIENT }}
        />
        <div className="cg-wheel-well" style={{ inset: WHEEL_RING }}>
          <ToneSwatch swatch={currentSwatch} size="lg" />
          <span className="cg-wheel-label">{currentLabel}</span>
          <span className="cg-wheel-hint">
            {selected === "all" ? labels.toneWheelHint : labels.toneWheelClearHint}
          </span>
        </div>
        {knob && (
          <span
            className="cg-wheel-knob"
            style={{ left: knob.left, top: knob.top, background: currentSwatch ?? undefined }}
          />
        )}
      </div>
      <div className="cg-chips">
        <button
          type="button"
          onClick={() => onSelect("all")}
          className={cx("cg-chip", selected === "all" && "is-active")}
          aria-pressed={selected === "all"}
        >
          {labels.all}
        </button>
        <button
          type="button"
          onClick={() => onSelect("neutral")}
          className={cx("cg-chip", selected === "neutral" && "is-active")}
          aria-pressed={selected === "neutral"}
        >
          <ToneSwatch swatch={NEUTRAL_SWATCH} size="sm" />
          {labels.tones.neutral}
        </button>
      </div>
    </div>
  );
}

function ViewSwitcher({
  views,
  viewMode,
  setViewMode,
  labels,
}: {
  views: readonly ViewMode[];
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  labels: GalleryLabels;
}) {
  return (
    <div className="cg-switcher">
      {views.map((mode) => {
        const Icon = VIEW_ICONS[mode];
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={cx("cg-switcher-btn", viewMode === mode && "is-active")}
            aria-label={`${labels.views[mode]} ${labels.viewSuffix}`}
            aria-pressed={viewMode === mode}
          >
            <Icon className="cg-icon-sm cg-mobile-only" />
            <span className="cg-desktop-only">{labels.views[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface ControlsProps {
  views: readonly ViewMode[];
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  categories: CategoryOption[];
  selectedTag: string;
  setSelectedTag: (t: string) => void;
  showTones: boolean;
  selectedTone: ToneValue;
  setSelectedTone: (t: ToneValue) => void;
  onShuffle?: () => void;
  labels: GalleryLabels;
}

export function Controls({
  views,
  viewMode,
  setViewMode,
  categories,
  selectedTag,
  setSelectedTag,
  showTones,
  selectedTone,
  setSelectedTone,
  onShuffle,
  labels,
}: ControlsProps) {
  // While a shuffle runs, swap the icon for an animated ellipsis, then revert.
  const [shuffling, setShuffling] = useState(false);
  const shuffleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (shuffleTimer.current) clearTimeout(shuffleTimer.current);
    },
    []
  );

  const handleShuffle = () => {
    onShuffle?.();
    setShuffling(true);
    if (shuffleTimer.current) clearTimeout(shuffleTimer.current);
    shuffleTimer.current = setTimeout(() => setShuffling(false), 600);
  };

  const showTags = categories.length > 0;
  const tagLabel = categories.find((t) => t.value === selectedTag)?.label ?? labels.all;
  const tagActive = selectedTag !== "all";
  const toneActive = selectedTone !== "all";
  const anyActive = tagActive || toneActive;

  return (
    <div className="cg-controls">
      {(showTags || showTones) && (
        <>
          {/* Wider screens: a dropdown per filter */}
          <div className="cg-filters cg-desktop-only">
            {showTags && (
              <Popover
                renderTrigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    className={cx("cg-trigger", tagActive && "is-active")}
                  >
                    <span>{tagActive ? tagLabel : labels.allTags}</span>
                    <ChevronDownIcon className={cx("cg-icon-xs cg-chevron", open && "is-open")} />
                  </button>
                )}
              >
                {(close) => (
                  <TagOptions
                    categories={categories}
                    selected={selectedTag}
                    labels={labels}
                    onSelect={(v) => {
                      setSelectedTag(v);
                      close();
                    }}
                  />
                )}
              </Popover>
            )}

            {showTones && (
              <Popover
                renderTrigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    className={cx("cg-trigger", toneActive && "is-active")}
                  >
                    <ToneSwatch swatch={toneSwatch(selectedTone)} size="md" />
                    <span>{toneActive ? labels.tones[selectedTone] : labels.allTones}</span>
                    <ChevronDownIcon className={cx("cg-icon-xs cg-chevron", open && "is-open")} />
                  </button>
                )}
              >
                {() => <ToneWheel selected={selectedTone} onSelect={setSelectedTone} labels={labels} />}
              </Popover>
            )}
          </div>

          {/* Phones: one button opening a sectioned panel */}
          <div className="cg-mobile-only">
            <Popover
              wide
              renderTrigger={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  className={cx("cg-trigger", anyActive && "is-active")}
                >
                  <FilterIcon className="cg-icon-sm" />
                  <span>{labels.filters}</span>
                  {anyActive && <span className="cg-badge" />}
                </button>
              )}
            >
              {() => (
                <div className="cg-sections">
                  {showTags && (
                    <div>
                      <p className="cg-section-label">{labels.tag}</p>
                      <TagOptions
                        categories={categories}
                        selected={selectedTag}
                        onSelect={setSelectedTag}
                        labels={labels}
                      />
                    </div>
                  )}
                  {showTones && (
                    <div className={cx(showTags && "cg-section-divided")}>
                      <p className="cg-section-label">{labels.tone}</p>
                      <ToneWheel selected={selectedTone} onSelect={setSelectedTone} labels={labels} />
                    </div>
                  )}
                </div>
              )}
            </Popover>
          </div>
        </>
      )}

      <div className="cg-actions">
        {views.length > 1 && (
          <ViewSwitcher views={views} viewMode={viewMode} setViewMode={setViewMode} labels={labels} />
        )}
        {onShuffle && (
          <button
            type="button"
            onClick={handleShuffle}
            disabled={shuffling}
            aria-label={labels.shuffle}
            title={labels.shuffle}
            className="cg-shuffle"
          >
            {shuffling ? <EllipsisLoader /> : <ShuffleIcon className="cg-icon-sm" />}
          </button>
        )}
      </div>
    </div>
  );
}
