type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export const HelpIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6V14" />
    <path d="M12 17.2v.3" strokeWidth={2.75} />
  </svg>
);

export const StatsIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 20V13M12 20V5M19 20V10" strokeWidth={3} />
  </svg>
);

export const SettingsIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <rect x="13" y="4.5" width="4" height="5" />
    <rect x="7" y="14.5" width="4" height="5" />
  </svg>
);

export const CloseIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const BackspaceIcon = ({ className }: P) => (
  <svg {...base} className={className} strokeWidth={2}>
    <path d="M8.5 5H21v14H8.5L3 12Z" />
    <path d="m11.5 9.5 5 5m0-5-5 5" />
  </svg>
);

export const TickIcon = ({ className }: P) => (
  <svg {...base} className={className} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ShareIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="8" y="8" width="12" height="12" />
    <path d="M16 4H4v12" />
  </svg>
);

export const ArrowIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);
