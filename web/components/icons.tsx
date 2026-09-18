import type { SVGProps } from "react";

export type IconName =
  | "arrow-left"
  | "book"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "contrast"
  | "download"
  | "filter"
  | "grid"
  | "globe"
  | "heart"
  | "home"
  | "library"
  | "menu"
  | "music"
  | "pause"
  | "play"
  | "plus"
  | "search"
  | "share"
  | "sliders"
  | "settings"
  | "skip-back"
  | "skip-forward"
  | "star"
  | "stop"
  | "trash"
  | "upload";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 24, ...props }: IconProps) {
  // Dark Reader injects stroke attributes into these filled controls before
  // React hydrates. Limit suppression to the SVG nodes it mutates rather than
  // hiding unrelated hydration warnings across every icon.
  const isDarkReaderTarget = name === "contrast" || name === "play" || name === "skip-forward";
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  // Dark Reader can mutate SVG attributes before React hydrates in the browser.
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...shared}
      {...props}
      suppressHydrationWarning={isDarkReaderTarget}
    >
      {name === "home" && <><path d="m3 10.8 9-7.1 9 7.1v9.1a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 19.9z" /><path d="M9 21.5v-6h6v6" /></>}
      {name === "grid" && <><rect height="6.5" rx="1.3" width="6.5" x="3.5" y="3.5" /><rect height="6.5" rx="1.3" width="6.5" x="14" y="3.5" /><rect height="6.5" rx="1.3" width="6.5" x="3.5" y="14" /><rect height="6.5" rx="1.3" width="6.5" x="14" y="14" /></>}
      {name === "globe" && <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5M12 3.5C9.7 5.9 8.5 8.7 8.5 12s1.2 6.1 3.5 8.5" /></>}
      {name === "library" && <><path d="M4.5 3.5h3.8v17H4.5zM10.1 3.5h3.8v17h-3.8zM16 4.4l3.5-.9 4.1 16-3.5.9z" /></>}
      {name === "settings" && <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5.3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>}
      {name === "search" && <><circle cx="10.8" cy="10.8" r="6.4" /><path d="m16 16 4.3 4.3" /></>}
      {name === "heart" && <path d="M20.8 8.8c0 5.5-8.8 10.6-8.8 10.6S3.2 14.3 3.2 8.8A4.3 4.3 0 0 1 11 6.3l1 1 1-1a4.3 4.3 0 0 1 7.8 2.5Z" />}
      {name === "trash" && <><path d="M4.5 7.2h15M9.4 3.8h5.2l.8 3.4H8.6zM6.4 7.2l.8 13h8.6l.8-13M10 10.5v6.5M14 10.5v6.5" /></>}
      {name === "upload" && <><path d="M12 15.8V3.8M7.6 8.2 12 3.8l4.4 4.4M4 16.5v3.8h16v-3.8" /></>}
      {name === "book" && <><path d="M4 4.6A2.6 2.6 0 0 1 6.6 2H20v17.4H6.6A2.6 2.6 0 0 0 4 22z" /><path d="M4 4.6v14.8M8 6h8M8 9h8" /></>}
      {name === "chevron-left" && <path d="m14.5 5-7 7 7 7" />}
      {name === "chevron-right" && <path d="m9.5 5 7 7-7 7" />}
      {name === "arrow-left" && <><path d="M19.5 12h-15M9 5.5 2.5 12 9 18.5" /></>}
      {name === "menu" && <><path d="M4 7h16M4 12h16M4 17h16" /></>}
      {name === "close" && <><path d="m5 5 14 14M19 5 5 19" /></>}
      {name === "download" && <><path d="M12 3.5v11.8M7.4 10.7 12 15.3l4.6-4.6M4 19.5h16" /></>}
      {name === "share" && <><circle cx="18" cy="5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="m8.1 10.9 7.7-4.6M8.1 13.1l7.7 4.6" /></>}
      {name === "filter" && <><path d="M4 6h16M7 12h10M10 18h4" /></>}
      {name === "sliders" && <><path d="M5 5h14M5 12h14M5 19h14" /><circle cx="9" cy="5" r="2" fill="var(--surface)" /><circle cx="15" cy="12" r="2" fill="var(--surface)" /><circle cx="11" cy="19" r="2" fill="var(--surface)" /></>}
      {name === "play" && <path d="m8.2 5.4 10.2 6.6-10.2 6.6z" fill="currentColor" stroke="none" suppressHydrationWarning />}
      {name === "pause" && <><path d="M8 5.3v13.4M16 5.3v13.4" strokeWidth="3" /></>}
      {name === "stop" && <rect fill="currentColor" height="10" stroke="none" width="10" x="7" y="7" />}
      {name === "skip-back" && <><path d="m11 6-6 6 6 6z" fill="currentColor" stroke="none" /><path d="m19 6-6 6 6 6z" fill="currentColor" stroke="none" /></>}
      {name === "skip-forward" && <><path d="m13 6 6 6-6 6z" fill="currentColor" stroke="none" suppressHydrationWarning /><path d="m5 6 6 6-6 6z" fill="currentColor" stroke="none" suppressHydrationWarning /></>}
      {name === "plus" && <><path d="M12 5v14M5 12h14" /></>}
      {name === "contrast" && <><circle cx="12" cy="12" r="8.2" suppressHydrationWarning /><path d="M12 3.8a8.2 8.2 0 0 0 0 16.4z" fill="currentColor" stroke="none" suppressHydrationWarning /></>}
      {name === "music" && <><path d="M9 18.5V6.4l9-2v12.1" /><circle cx="6.7" cy="18" r="2.2" /><circle cx="15.7" cy="16" r="2.2" /></>}
      {name === "star" && <path d="m12 3.4 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z" />}
      {name === "check" && <path d="m5 12.5 4.5 4.4L19.5 7" />}
    </svg>
  );
}
