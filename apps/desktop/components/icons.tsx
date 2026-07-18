type IconName =
  | "accounts"
  | "arrow"
  | "dashboard"
  | "goal"
  | "lock"
  | "plan"
  | "refresh"
  | "report"
  | "shield"
  | "spark"
  | "wallet";

type IconProps = React.SVGProps<SVGSVGElement> & { name: IconName };

export function Icon({ name, ...props }: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  const paths: Record<IconName, React.ReactNode> = {
    accounts: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 9h18M7 15h4" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    goal: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="m14.5 9.5 5-5M16 4h4v4" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      </>
    ),
    plan: (
      <>
        <path d="M7 3h10v18H7zM9.5 8h5M9.5 12h5M9.5 16h3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 6v5h-5" />
        <path d="M18.2 15a7 7 0 1 1-.7-7.8L20 10" />
      </>
    ),
    report: (
      <>
        <path d="M5 20V10M12 20V4M19 20v-7" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.7 2.7 8 7 10 4.3-2 7-5.3 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    spark: (
      <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" />
    ),
    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v13H6a2 2 0 0 1-2-2V6.5Z" />
        <path d="M4 8h16M15 12h6v4h-6a2 2 0 0 1 0-4Z" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common} {...props}>
      {paths[name]}
    </svg>
  );
}

export function WorthlaneMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Worthlane"
    >
      <path
        d="M6 9.5 12.9 30h5.7L21 22.3 23.4 30h5.7L36 9.5h-6.2l-3.7 13.1-2.7-8.8h-4.8l-2.7 8.8-3.7-13.1H6Z"
        fill="currentColor"
      />
    </svg>
  );
}
