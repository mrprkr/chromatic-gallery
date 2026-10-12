interface IconProps {
  className?: string;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  "aria-hidden": true,
} as const;

export function GridIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...stroke} strokeWidth={1.4}>
      <rect x="1" y="1" width="6.5" height="6.5" rx="1" />
      <rect x="10.5" y="1" width="6.5" height="6.5" rx="1" />
      <rect x="1" y="10.5" width="6.5" height="6.5" rx="1" />
      <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}

/** A tall tile beside two stacked tiles, hinting at the bento layout on phones. */
export function BentoIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...stroke} strokeWidth={1.4}>
      <rect x="1" y="1" width="7" height="16" rx="1" />
      <rect x="10" y="1" width="7" height="7" rx="1" />
      <rect x="10" y="10" width="7" height="7" rx="1" />
    </svg>
  );
}

export function TimelineIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...stroke} strokeWidth={1.4} strokeLinecap="round">
      <line x1="3" y1="3" x2="3" y2="15" />
      <circle cx="3" cy="5" r="1.6" />
      <circle cx="3" cy="13" r="1.6" />
      <line x1="7" y1="5" x2="16" y2="5" />
      <line x1="7" y1="13" x2="16" y2="13" />
    </svg>
  );
}

export function ShuffleIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      {...stroke}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4h2.5l8 10H16" />
      <path d="M13.5 11.5 16 14l-2.5 2.5" />
      <path d="M2 14h2.5l2.2-2.75" />
      <path d="M10.3 6.75 12.5 4H16" />
      <path d="M13.5 1.5 16 4l-2.5 2.5" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/** Three dots that bounce in sequence while a shuffle runs. */
export function EllipsisLoader() {
  return (
    <span className="cg-ellipsis" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}
