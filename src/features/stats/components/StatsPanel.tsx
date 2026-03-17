import { useMemo } from 'react';
import type { Segment, SrsRecord, Bookmark } from '../../../core/types';
import { GameCharacter } from '../../../core/enums';
import { BOOKMARKS } from '../../../core/bookmarks';

interface StatsPanelProps {
  segments: Segment[];
  srsRecords: Record<number, SrsRecord>;
  onClose: () => void;
}

interface CharacterStats {
  total: number;
  hard: number;
  good: number;
  easy: number;
  notStudied: number;
  studied: number;
  dueNow: number;
  mastery: number;
}

function computeStats(
  segments: Segment[],
  srsRecords: Record<number, SrsRecord>,
  character: string
): CharacterStats {
  const userSegments = segments.filter((s) => s.speaker === character);
  const total = userSegments.length;
  if (total === 0) return { total: 0, hard: 0, good: 0, easy: 0, notStudied: 0, studied: 0, dueNow: 0, mastery: 0 };

  let hard = 0, good = 0, easy = 0, notStudied = 0, dueNow = 0;
  const now = Date.now();

  for (const seg of userSegments) {
    const record = srsRecords[seg.id];
    if (!record) { notStudied++; dueNow++; continue; }
    if (record.box === 0) hard++;
    else if (record.box === 1) good++;
    else if (record.box === 2) easy++;
    if (now >= record.nextDate) dueNow++;
  }

  const studied = total - notStudied;
  const mastery = total > 0 ? Math.round(((good + easy * 2) / (total * 2)) * 100) : 0;
  return { total, hard, good, easy, notStudied, studied, dueNow, mastery };
}

function computeSectionStats(
  segments: Segment[],
  srsRecords: Record<number, SrsRecord>,
  bookmark: Bookmark,
  character: string
): CharacterStats {
  const sectionSegments = segments.filter(
    (s) => s.id >= bookmark.startSegmentId && s.id <= bookmark.endSegmentId
  );
  return computeStats(sectionSegments, srsRecords, character);
}

const PROGRESS_SEGMENTS_DEF = [
  { key: 'easy', label: 'Easy', className: 'stats-bar-easy' },
  { key: 'good', label: 'Good', className: 'stats-bar-good' },
  { key: 'hard', label: 'Hard', className: 'stats-bar-hard' },
  { key: 'notStudied', label: 'New', className: 'stats-bar-new' },
] as const;

function MiniProgressBar({ stats }: { stats: CharacterStats }) {
  if (stats.total === 0) return null;
  return (
    <div className="stats-progress-bar stats-progress-bar--mini">
      {PROGRESS_SEGMENTS_DEF.map((def) => {
        const count = stats[def.key];
        return count > 0 ? (
          <div key={def.key} className={`stats-bar-segment ${def.className}`} style={{ flex: count }} />
        ) : null;
      })}
    </div>
  );
}

function CharacterSection({
  character,
  segments,
  srsRecords,
}: {
  character: string;
  segments: Segment[];
  srsRecords: Record<number, SrsRecord>;
}) {
  const overall = useMemo(() => computeStats(segments, srsRecords, character), [segments, srsRecords, character]);
  const sectionStats = useMemo(
    () => BOOKMARKS.map((bm) => ({ bookmark: bm, stats: computeSectionStats(segments, srsRecords, bm, character) })),
    [segments, srsRecords, character]
  );

  if (overall.total === 0) return null;

  return (
    <div className="stats-character-section">
      <h3 className="stats-character-name">{character}</h3>

      {/* Overall mastery + bar */}
      <div className="stats-overall-row">
        <span className="stats-mastery-compact">{overall.mastery}%</span>
        <div className="stats-overall-bar-wrap">
          <MiniProgressBar stats={overall} />
        </div>
        <span className="stats-studied-compact">{overall.studied}/{overall.total}</span>
      </div>

      {/* Per-section breakdown */}
      <div className="stats-sections">
        {sectionStats.map(({ bookmark, stats }) => {
          if (stats.total === 0) return null;
          return (
            <div key={bookmark.id} className="stats-section-row">
              <span className="stats-section-label">{bookmark.label}</span>
              <div className="stats-section-bar-wrap">
                <MiniProgressBar stats={stats} />
              </div>
              <span className="stats-section-count">{stats.studied}/{stats.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatsPanel({ segments, srsRecords, onClose }: StatsPanelProps) {
  return (
    <>
      <div className="bookmark-backdrop" onClick={onClose} />
      <div className="bookmark-panel stats-panel">
        <div className="bookmark-panel-header">
          <span className="bookmark-panel-title">Progress</span>
          <button className="bookmark-panel-close" onClick={onClose} aria-label="Close stats">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="stats-content">
          {/* Legend */}
          <div className="stats-legend">
            {PROGRESS_SEGMENTS_DEF.map((def) => (
              <div key={def.key} className="stats-legend-item">
                <div className={`stats-legend-dot ${def.className}`} />
                <span className="stats-legend-label">{def.label}</span>
              </div>
            ))}
          </div>

          <CharacterSection character={GameCharacter.TED} segments={segments} srsRecords={srsRecords} />
          <CharacterSection character={GameCharacter.PEGGY} segments={segments} srsRecords={srsRecords} />
        </div>
      </div>
    </>
  );
}
