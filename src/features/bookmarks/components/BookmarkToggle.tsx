interface BookmarkToggleProps {
  hasActive: boolean;
  onClick: () => void;
}

export function BookmarkToggle({ hasActive, onClick }: BookmarkToggleProps) {
  return (
    <button
      className={`bookmark-toggle${hasActive ? ' has-active' : ''}`}
      onClick={onClick}
      aria-label="Open bookmarks"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
