interface IconProps {
  id: IconId;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export type IconId =
  | "search"
  | "sun"
  | "moon"
  | "close"
  | "lock"
  | "lock-solid"
  | "lock-open"
  | "globe"
  | "file"
  | "folder"
  | "settings"
  | "trash"
  | "plus"
  | "check"
  | "refresh"
  | "repo"
  | "github"
  | "gitlab"
  | "star"
  | "fork"
  | "eye"
  | "calendar"
  | "clock"
  | "tag"
  | "external-link"
  | "home"
  | "shield"
  | "alert-circle";

const ICONS: Record<IconId, { viewBox: string; content: string }> = {
  search: {
    viewBox: "0 0 16 16",
    content: `<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" fill="none"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  sun: {
    viewBox: "0 0 16 16",
    content: `<circle cx="8" cy="8" r="2.8" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="8" y1="1.5" x2="8" y2="3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="13" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="1.5" y1="8" x2="3" y2="8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="13" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="3.4" y1="3.4" x2="4.4" y2="4.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="11.6" y1="11.6" x2="12.6" y2="12.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="12.6" y1="3.4" x2="11.6" y2="4.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="4.4" y1="11.6" x2="3.4" y2="12.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  },
  moon: {
    viewBox: "0 0 16 16",
    content: `<path d="M13 10.5A5.5 5.5 0 015.5 3a5.5 5.5 0 000 10A5.5 5.5 0 0013 10.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  close: {
    viewBox: "0 0 14 14",
    content: `<line x1="2.5" y1="2.5" x2="11.5" y2="11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="11.5" y1="2.5" x2="2.5" y2="11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  lock: {
    viewBox: "0 0 14 14",
    content: `<rect x="2.5" y="6" width="9" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  },
  "lock-solid": {
    viewBox: "0 0 14 14",
    content: `<rect x="2.5" y="6" width="9" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor"/><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  },
  "lock-open": {
    viewBox: "0 0 14 14",
    content: `<rect x="2.5" y="6" width="9" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M4.5 6V4.5a2.5 2.5 0 015 0V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
  },
  globe: {
    viewBox: "0 0 14 14",
    content: `<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M7 2c-1.5 2-1.5 8 0 10M7 2c1.5 2 1.5 8 0 10M2 7h10" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/>`,
  },
  file: {
    viewBox: "0 0 16 16",
    content: `<path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/><path d="M10 2v4h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  folder: {
    viewBox: "0 0 16 16",
    content: `<path d="M2 4.5A1.5 1.5 0 013.5 3h2.6l1.4 1.5h5A1.5 1.5 0 0114 6v6.5A1.5 1.5 0 0112.5 14h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/>`,
  },
  settings: {
    viewBox: "0 0 24 24",
    content: `<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/>`,
  },
  trash: {
    viewBox: "0 0 14 14",
    content: `<path d="M2 4h10M5 4V2.5h4V4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  plus: {
    viewBox: "0 0 16 16",
    content: `<line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  check: {
    viewBox: "0 0 14 14",
    content: `<path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  refresh: {
    viewBox: "0 0 14 14",
    content: `<path d="M11.5 7A4.5 4.5 0 013 8.7M2.5 7A4.5 4.5 0 0111 5.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M11.5 2.5V5.3H8.7M2.5 11.5V8.7h2.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  repo: {
    viewBox: "0 0 16 16",
    content: `<path fill="currentColor" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>`,
  },
  github: {
    viewBox: "0 0 16 16",
    content: `<path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>`,
  },
  gitlab: {
    viewBox: "0 0 24 24",
    content: `<path fill="currentColor" d="M12 21.42l3.68-11.33H8.32L12 21.42z"/><path fill="currentColor" d="M4.03 10.09L2.29 15.6a.68.68 0 00.24.75l9.47 6.9-7.97-13.16z"/><path fill="currentColor" d="M4.03 10.09h4.29L6.4 3.85a.36.36 0 00-.68 0l-1.69 6.24z"/><path fill="currentColor" d="M19.97 10.09l1.74 5.51a.68.68 0 01-.24.75l-9.47 6.9 7.97-13.16z"/><path fill="currentColor" d="M19.97 10.09h-4.29l1.92-6.24a.36.36 0 01.68 0l1.69 6.24z"/>`,
  },
  star: {
    viewBox: "0 0 14 14",
    content: `<path d="M7 1.2l1.7 3.5 3.8.5-2.8 2.7.7 3.8L7 9.8 3.6 11.7l.7-3.8L1.5 5.2l3.8-.5L7 1.2z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" fill="none"/>`,
  },
  fork: {
    viewBox: "0 0 14 14",
    content: `<circle cx="3.5" cy="3" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="10.5" cy="3" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="7" cy="11" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M3.5 4.5V6a2 2 0 002 2h3a2 2 0 002-2V4.5M7 8v1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/>`,
  },
  eye: {
    viewBox: "0 0 14 14",
    content: `<path d="M1 7s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/><circle cx="7" cy="7" r="1.8" stroke="currentColor" stroke-width="1.1" fill="none"/>`,
  },
  calendar: {
    viewBox: "0 0 14 14",
    content: `<rect x="1.5" y="2.5" width="11" height="10" rx="1.2" stroke="currentColor" stroke-width="1.1" fill="none"/><line x1="1.5" y1="5.3" x2="12.5" y2="5.3" stroke="currentColor" stroke-width="1.1"/><line x1="4" y1="1.2" x2="4" y2="3.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><line x1="10" y1="1.2" x2="10" y2="3.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>`,
  },
  clock: {
    viewBox: "0 0 14 14",
    content: `<circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.1" fill="none"/><path d="M7 4v3l2.2 1.3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  tag: {
    viewBox: "0 0 14 14",
    content: `<path d="M1.5 1.5h4.8L12.5 7.5 7.5 12.5 1.5 6.5V1.5z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" fill="none"/><circle cx="4" cy="4" r="0.9" fill="currentColor"/>`,
  },
  "external-link": {
    viewBox: "0 0 14 14",
    content: `<path d="M6 2H2.5a1 1 0 00-1 1v8.5a1 1 0 001 1H11a1 1 0 001-1V8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 1.5h4.5V6M12.3 1.7L6.8 7.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  home: {
    viewBox: "0 0 14 14",
    content: `<path d="M1.5 6.5L7 1.8l5.5 4.7M3 5.6v6.1a.8.8 0 00.8.8h6.4a.8.8 0 00.8-.8V5.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  shield: {
    viewBox: "0 0 14 14",
    content: `<path d="M7 1.3l4.5 1.6v3.5c0 3-1.9 5-4.5 6.3-2.6-1.3-4.5-3.3-4.5-6.3V2.9L7 1.3z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" fill="none"/>`,
  },
  "alert-circle": {
    viewBox: "0 0 14 14",
    content: `<circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.1" fill="none"/><line x1="7" y1="4.2" x2="7" y2="7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="9.8" r="0.7" fill="currentColor"/>`,
  },
};

export function Icon({ id, size = 14, style, className }: IconProps) {
  const icon = ICONS[id];
  // display:block strips the SVG's default inline baseline gap, which is
  // what throws off vertical centering next to text in a flex row.
  return <svg width={size} height={size} viewBox={icon.viewBox} fill="none" style={{ display: "block", ...style }} className={className} dangerouslySetInnerHTML={{ __html: icon.content }} />;
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <circle cx="14" cy="14" r="7" stroke="var(--bg-base)" strokeWidth="2.2" fill="none" />
      <line x1="19.2" y1="19.2" x2="25" y2="25" stroke="var(--bg-base)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
