import { useCallback, useMemo } from 'react';
import type { Segment, TimeRange } from '../../../core/types';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  userSegments?: Segment[];
  activeRanges?: TimeRange[] | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar({ currentTime, duration, onSeek, userSegments, activeRanges }: ProgressBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  // Compute inactive overlays: the gaps between/around active ranges
  const inactiveOverlays = useMemo(() => {
    if (!activeRanges || duration <= 0) return null;
    const overlays: { left: number; width: number }[] = [];
    let cursor = 0;
    for (const r of activeRanges) {
      if (r.start > cursor) {
        overlays.push({
          left: (cursor / duration) * 100,
          width: ((r.start - cursor) / duration) * 100,
        });
      }
      cursor = r.end;
    }
    if (cursor < duration) {
      overlays.push({
        left: (cursor / duration) * 100,
        width: ((duration - cursor) / duration) * 100,
      });
    }
    return overlays;
  }, [activeRanges, duration]);

  return (
    <div className="progress-container">
      <div className="progress-bar" onClick={handleClick}>
        {userSegments?.map((seg) => {
          const left = (seg.start / duration) * 100;
          const width = ((seg.end - seg.start) / duration) * 100;
          return (
            <div
              key={seg.id}
              className="user-segment-marker"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {inactiveOverlays?.map((overlay, i) => (
          <div
            key={`inactive-${i}`}
            className="progress-inactive-overlay"
            style={{ left: `${overlay.left}%`, width: `${overlay.width}%` }}
          />
        ))}
        <div className="progress-fill" style={{ width: `${progress}%` }} />
        <div className="progress-thumb" style={{ left: `${progress}%` }} />
      </div>
      <div className="progress-times">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
