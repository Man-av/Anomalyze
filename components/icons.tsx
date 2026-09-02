/**
 * Inline SVG icons — no icon-library dependency. Each accepts a size and
 * className and inherits color via `currentColor`, so they theme automatically.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function LogoMark() {
  return (
    // The glyph is the product's subject, so it carries the accent directly.
    // It used to sit reversed inside an accent-filled rounded square, which is
    // the generic app-icon mark and spent the accent budget on chrome.
    <span className="flex shrink-0 items-center text-accent">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 17l5-6 4 4 5-8 4 6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function UploadIcon({ size = 34, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

export function DocIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z M14 3v4h4 M8 12h8 M8 16h5" />
    </svg>
  );
}

export function AlertIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 3l9 16H3l9-16z M12 10v4 M12 17.5v.5" />
    </svg>
  );
}

export function ChartIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 20V10 M10 20V4 M16 20v-7 M22 20H2" />
    </svg>
  );
}

export function ChatIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.2A8 8 0 1121 12z" />
    </svg>
  );
}

export function TableIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 5h18v14H3z M3 10h18 M9 5v14" />
    </svg>
  );
}

export function RefreshIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M20 11a8 8 0 10-2.3 5.7M20 20v-5h-5" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 19V5m0 0l-6 6m6-6l6 6" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 5v14m0 0l6-6m-6 6l-6-6" />
    </svg>
  );
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function SpinnerIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SunIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  );
}
