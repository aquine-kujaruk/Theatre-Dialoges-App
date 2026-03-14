import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import type { Segment } from '../types';

interface LineDisplayProps {
  segments: Segment[];
  currentSegmentIndex: number;
  waitingForUser: boolean;
  isCueing: boolean;
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

export function LineDisplay({
  segments,
  currentSegmentIndex,
  waitingForUser,
  isCueing,
  isRehearsing,
  selectedCharacter,
  onSeek,
}: LineDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const isAutoScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Auto-scroll when the active segment changes
  useEffect(() => {
    if (!autoScroll || currentSegmentIndex < 0) return;
    if (!activeRef.current || !containerRef.current) return;

    isAutoScrolling.current = true;
    activeRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isAutoScrolling.current = false;
    }, 600);
  }, [currentSegmentIndex, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (isAutoScrolling.current) return;
    setAutoScroll(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    return () => clearTimeout(scrollTimeout.current);
  }, []);

  const scrollToCurrent = useCallback(() => {
    setAutoScroll(true);
    if (activeRef.current) {
      isAutoScrolling.current = true;
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isAutoScrolling.current = false;
      }, 600);
    }
  }, []);

  // Group consecutive same-speaker segments, but only for display purposes
  const groups = useMemo(() => {
    const result: { speaker: string; segments: Segment[]; startIndex: number; endIndex: number }[] = [];
    let i = 0;
    while (i < segments.length) {
      const speaker = segments[i].speaker;
      const startIndex = i;
      const groupSegs: Segment[] = [segments[i]];
      while (i + 1 < segments.length && segments[i + 1].speaker === speaker) {
        i++;
        groupSegs.push(segments[i]);
      }
      result.push({ speaker, segments: groupSegs, startIndex, endIndex: i });
      i++;
    }
    return result;
  }, [segments]);

  const activeGroupIndex = useMemo(() => {
    if (currentSegmentIndex < 0) return -1;
    return groups.findIndex(
      (g) => currentSegmentIndex >= g.startIndex && currentSegmentIndex <= g.endIndex
    );
  }, [groups, currentSegmentIndex]);

  if (segments.length === 0) {
    return (
      <div className="transcript">
        <p className="line-text empty">Press play to begin</p>
      </div>
    );
  }

  return (
    <div className="transcript" ref={containerRef}>
      {groups.map((group, groupIdx) => {
        const isActive = groupIdx === activeGroupIndex;
        const isPast = activeGroupIndex >= 0 && groupIdx < activeGroupIndex;
        const isUserLine = isRehearsing && selectedCharacter === group.speaker;
        const isUserTurn = isActive && waitingForUser && isUserLine;
        const showUserText = !isUserLine || isCueing || isPast;

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
                className={`transcript-text${isUserTurn ? ' user-line' : ''}${isUserLine && !showUserText ? ' hidden-line' : ''}`}
              >
                {showUserText ? seg.text.trim() : '\u00A0'}
              </p>
            ))}
          </div>
        );
      })}
      <div className="transcript-spacer" />

      {!autoScroll && activeGroupIndex >= 0 && (
        <button
          className="scroll-to-current-btn"
          onClick={scrollToCurrent}
          aria-label="Scroll to current line"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 13 12 18 17 13" />
            <polyline points="7 6 12 11 17 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
