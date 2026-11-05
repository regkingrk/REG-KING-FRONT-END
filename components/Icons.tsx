import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

type P = SVGProps<SVGSVGElement>;

export const ArrowRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const SearchIcon = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </svg>
);

export const UserIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
  </svg>
);

export const BagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2" />
  </svg>
);

export const GavelIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m14 5 5 5M11.5 7.5l5 5M9 10l-5.5 5.5a1.6 1.6 0 0 0 2.3 2.3L11.3 12.3" />
    <path d="M13 3.8 20.2 11M4 21h9" />
  </svg>
);

export const TagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.3 6.3a1.4 1.4 0 0 1-2 0L3.5 12.2Z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>
);

export const HistoryIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5M12 8v4l3 2" />
  </svg>
);

export const CameraIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const WrenchIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5Z" />
    <path d="M14.5 6.5 17 4l3 3-2.5 2.5" />
  </svg>
);

export const StarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path
      fill="currentColor"
      d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5Z"
    />
  </svg>
);

export const InstagramIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" />
  </svg>
);

export const PoundIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15.5 6.5A3.5 3.5 0 0 0 9 8v4.5c0 2.5-1 4.5-2.5 5.5h11" />
    <path d="M6.5 12.5h7" />
  </svg>
);

export const BriefcaseIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <path d="M9 7.5V5.5h6v2M3.5 12.5h17" />
  </svg>
);

export const ToolIcon = ({ name, ...p }: P & { name: string }) =>
  name === "finance" ? (
    <PoundIcon {...p} />
  ) : name === "trade" ? (
    <BriefcaseIcon {...p} />
  ) : name === "value" ? (
    <TagIcon {...p} />
  ) : name === "history" ? (
    <HistoryIcon {...p} />
  ) : name === "viewer" ? (
    <CameraIcon {...p} />
  ) : (
    <WrenchIcon {...p} />
  );

export const TvIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="18" height="12" rx="2" />
    <path d="M8 21h8M12 17.5V21" />
  </svg>
);

export const CrownIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 8.5 7.5 12 12 5.5 16.5 12l4-3.5-1.8 9.5H5.3L3.5 8.5Z" />
    <path d="M5.5 20.5h13" />
  </svg>
);
