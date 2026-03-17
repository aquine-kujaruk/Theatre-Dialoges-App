interface StatsToggleProps {
  onClick: () => void;
}

export function StatsToggle({ onClick }: StatsToggleProps) {
  return (
    <button
      className="stats-toggle"
      onClick={onClick}
      aria-label="View progress"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    </button>
  );
}
