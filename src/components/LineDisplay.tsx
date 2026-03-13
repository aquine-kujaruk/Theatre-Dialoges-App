import { useEffect, useRef, useMemo } from 'react';
import type { Segment } from '../types';

interface SegmentGroup {
  speaker: string;
  segments: Segment[];
  startIndex: number;
  endIndex: number;
}

interface LineDisplayProps {
  segments: Segment[];
  currentSegmentIndex: number;
  waitingForUser: boolean;
  isRehearsing: boolean;
  selectedCharacter: string | null;
  onSeek: (time: number) => void;
}

const SPEAKER_COLORS: Record<string, string> = {
  Peggy: 'var(--speaker-peggy)',
  Ted: 'var(--speaker-ted)',
  Brewster: 'var(--speaker-brewster)',
  Billy: 'var(--speaker-billy)',
  Winkie: 'var(--speaker-winkie)',
  Multiple: 'var(--speaker-multiple)',
};

function getSpeakerColor(speaker: string): string {
  return SPEAKER_COLORS[speaker] ?? 'var(--on-surface-secondary)';
}

function groupConsecutive(segments: Segment[]): SegmentGroup[] {
  const groups: SegmentGroup[] = [];
  let i = 0;
  while (i < segments.length) {
    const speaker = segments[i].speaker;
    const startIndex = i;
    const groupSegments: Segment[] = [segments[i]];
    while (i + 1 < segments.length && segments[i + 1].speaker === speaker) {
      i++;
      groupSegments.push(segments[i]);
    }
    groups.push({ speaker, segments: groupSegments, startIndex, endIndex: i });
    i++;
  }
  return groups;
}

export function LineDisplay({
  segments,
  currentSegmentIndex,
  waitingForUser,
  isRehearsing,
  selectedCharacter,
  onSeek,
}: LineDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupConsecutive(segments), [segments]);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSegmentIndex]);

  if (segments.length === 0) {
    return (
      <div className="transcript">
        <p className="line-text empty">Press play to begin</p>
      </div>
    );
  }

  return (
    <div className="transcript" ref={containerRef}>
      {groups.map((group) => {
        const isActive =
          currentSegmentIndex >= group.startIndex &&
          currentSegmentIndex <= group.endIndex;
        const isPast = currentSegmentIndex > group.endIndex;
        const isUserLine = isRehearsing && selectedCharacter === group.speaker;
        const isUserTurn = isActive && waitingForUser && isUserLine;

        let className = 'transcript-segment';
        if (isActive) className += ' active';
        if (isPast) className += ' past';
        if (isUserTurn) className += ' your-turn';

        return (
          <div
            key={group.startIndex}
            className={className}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSeek(group.segments[0].start)}
          >
            <span
              className="transcript-speaker"
              style={{ color: getSpeakerColor(group.speaker) }}
            >
              {group.speaker}
            </span>
            {group.segments.map((seg) => (
              <p
                key={seg.id}
                className={`transcript-text ${isUserTurn ? 'user-line' : ''}`}
              >
                {seg.text.trim()}
              </p>
            ))}
          </div>
        );
      })}
      <div className="transcript-spacer" />
    </div>
  );
}
