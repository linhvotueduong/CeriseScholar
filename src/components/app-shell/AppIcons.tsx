import type { ReactNode, SVGProps } from "react";

export type AppIconName =
  | "bell"
  | "alert"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up-right"
  | "book"
  | "book-open"
  | "bug"
  | "calendar"
  | "chevron-down"
  | "check-square"
  | "clock"
  | "dashboard"
  | "edit"
  | "external-link"
  | "file"
  | "folder"
  | "globe"
  | "help"
  | "laptop"
  | "lightbulb"
  | "list"
  | "lock"
  | "mail"
  | "moon"
  | "phone"
  | "play"
  | "plus"
  | "research"
  | "refresh"
  | "save"
  | "search"
  | "send"
  | "settings"
  | "shield"
  | "sliders"
  | "target"
  | "thumb-down"
  | "thumb-up"
  | "trash"
  | "trophy"
  | "upload"
  | "user"
  | "users"
  | "workflow";

const iconPaths: Record<AppIconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 3 2.8 19h18.4z" />
      <path d="M12 8v5M12 17h.01" />
    </>
  ),
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M9 7h8v8" />,
  bell: (
    <>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h5a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5z" />
      <path d="M19 4h-5a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h5z" />
    </>
  ),
  "book-open": (
    <>
      <path d="M4 5.5h6.5A2.5 2.5 0 0 1 13 8v11a2.8 2.8 0 0 0-2.5-1.5H4z" />
      <path d="M20 5.5h-6.5A2.5 2.5 0 0 0 11 8v11a2.8 2.8 0 0 1 2.5-1.5H20z" />
    </>
  ),
  bug: (
    <>
      <path d="M8 7a4 4 0 0 1 8 0" />
      <rect height="10" rx="4" width="8" x="8" y="8" />
      <path d="M4 13h4M16 13h4M5 19l3-2M19 19l-3-2M5 7l3 2M19 7l-3 2" />
    </>
  ),
  calendar: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  "chevron-down": <path d="m7 10 5 5 5-5" />,
  "check-square": (
    <>
      <rect height="16" rx="2" width="16" x="4" y="4" />
      <path d="m8.5 12 2.3 2.3 4.8-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  dashboard: (
    <>
      <rect height="6" rx="1.5" width="6" x="4" y="4" />
      <rect height="6" rx="1.5" width="6" x="14" y="4" />
      <rect height="6" rx="1.5" width="6" x="4" y="14" />
      <rect height="6" rx="1.5" width="6" x="14" y="14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  "external-link": (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M11 5H5v14h14v-6" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9.5 13h5M9.5 17h4" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 7V6a2 2 0 0 1 2-2h4l2 3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 0 1 4.5 1.2c0 1.8-2.3 2.1-2.3 3.7" />
      <path d="M12 17h.01" />
    </>
  ),
  laptop: (
    <>
      <rect height="11" rx="1.5" width="14" x="5" y="5" />
      <path d="M3 19h18l-2-3H5z" />
    </>
  ),
  moon: <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  lightbulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M8.5 14.5a6 6 0 1 1 7 0c-.8.6-1.3 1.4-1.5 2.5h-4c-.2-1.1-.7-1.9-1.5-2.5Z" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="16" x="4" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  mail: (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: (
    <>
      <rect height="18" rx="2" width="12" x="6" y="3" />
      <path d="M10 18h4" />
    </>
  ),
  play: <path d="M8 5v14l11-7z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  research: (
    <>
      <path d="M7 4h8l3 3v13H7z" />
      <path d="M14 4v4h4" />
      <path d="M9.5 12h5" />
      <path d="M9.5 16h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h12l2 2v16H5z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  send: (
    <>
      <path d="m21 3-6.8 18-3.9-8.3L2 8.8z" />
      <path d="m10.3 12.7 4.6-4.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.4 2.8 7.4 7 9 4.2-1.6 7-4.6 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  "thumb-down": (
    <>
      <path d="M7 10v10" />
      <path d="M15 3H7a2 2 0 0 0-2 2v9h7l-1 4a2.2 2.2 0 0 0 2.1 3h.3L19 11V5a2 2 0 0 0-2-2z" />
      <path d="M19 5h2v7h-2" />
    </>
  ),
  "thumb-up": (
    <>
      <path d="M7 14V4" />
      <path d="M15 21H7a2 2 0 0 1-2-2v-9h7l-1-4a2.2 2.2 0 0 1 2.1-3h.3L19 13v6a2 2 0 0 1-2 2z" />
      <path d="M19 12h2v7h-2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14M9 7V4h6v3" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a6 6 0 0 1 11 0" />
      <path d="M16 11a3 3 0 1 0-1-5.8M17 20a5 5 0 0 0-3-4.6" />
    </>
  ),
  workflow: (
    <>
      <rect height="6" rx="2" width="6" x="3" y="4" />
      <rect height="6" rx="2" width="6" x="15" y="4" />
      <rect height="6" rx="2" width="6" x="9" y="15" />
      <path d="M9 7h6M18 10v2a3 3 0 0 1-3 3h-3M6 10v2a3 3 0 0 0 3 3" />
    </>
  ),
};

export function AppIcon({
  className,
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: AppIconName;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
