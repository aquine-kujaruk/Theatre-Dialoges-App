import type { Bookmark, Segment } from '../../../core/types';

interface BookmarkPanelProps {
  bookmarks: Bookmark[];
  segments: Segment[];
  activeIds: Set<number>;
  onToggle: (id: number) => void;
  onClose: () => void;
}

function getPreviewText(bookmark: Bookmark, segments: Segment[]): { first: string; last: string } {
  const startSeg = segments.find(s => s.id === bookmark.startSegmentId);
  const endSeg = segments.find(s => s.id === bookmark.endSegmentId);
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max).trimEnd() + '...' : text;
  return {
    first: startSeg ? truncate(startSeg.text.trim(), 45) : '',
    last: endSeg ? truncate(endSeg.text.trim(), 45) : '',
  };
}

export function BookmarkPanel({ bookmarks, segments, activeIds, onToggle, onClose }: BookmarkPanelProps) {
  return (
    <>
      <div className="bookmark-backdrop" onClick={onClose} />
      <div className="bookmark-panel">
        <div className="bookmark-panel-header">
          <span className="bookmark-panel-title">Sections</span>
          <button className="bookmark-panel-close" onClick={onClose} aria-label="Close bookmarks">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="bookmark-list">
          {bookmarks.map((bm) => {
            const preview = getPreviewText(bm, segments);
            const isActive = activeIds.has(bm.id);
            return (
              <button
                key={bm.id}
                className={`bookmark-item${isActive ? ' active' : ''}`}
                onClick={() => onToggle(bm.id)}
              >
                <div className="bookmark-item-check">
                  {isActive ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <div className="bookmark-item-unchecked" />
                  )}
                </div>
                <div className="bookmark-item-content">
                  <span className="bookmark-item-label">{bm.label}</span>
                  <span className="bookmark-item-preview">
                    &ldquo;{preview.first}&rdquo;
                  </span>
                  <span className="bookmark-item-preview bookmark-item-preview-last">
                    &hellip; &ldquo;{preview.last}&rdquo;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
