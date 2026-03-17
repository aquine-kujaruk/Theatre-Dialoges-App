import { useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { Segment, Mode, Character, TimeRange } from '../../../core/types';
import { AudioMode } from '../../../core/enums';

interface UseRehearsalEngineOptions {
  wavesurferRef: React.MutableRefObject<WaveSurfer | null>;
  segments: Segment[];
  mode: Mode;
  selectedCharacter: Character | null;
  findSegmentIndex: (time: number) => number;
  findNextUserSegmentIndex: (fromIndex: number) => number;
  isInUserSegment: (time: number) => boolean;
  waitingForUser: boolean;
  setWaitingForUser: (waiting: boolean) => void;
  setCurrentTime: (time: number) => void;
  setCurrentSegmentIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  cuingRef: React.MutableRefObject<boolean>;
  cueEndRef: React.MutableRefObject<number>;
  setIsCueing: (cueing: boolean) => void;
  onCueEndRef: React.MutableRefObject<(() => void) | null>;
  activeRanges: TimeRange[] | null;
}

function isTimeInRanges(time: number, ranges: TimeRange[]): boolean {
  for (const r of ranges) {
    if (time >= r.start && time <= r.end) return true;
  }
  return false;
}

function findCurrentRangeEnd(time: number, ranges: TimeRange[]): number | null {
  for (const r of ranges) {
    if (time >= r.start && time <= r.end) return r.end;
  }
  return null;
}

function findNextRangeStart(time: number, ranges: TimeRange[]): number | null {
  for (const r of ranges) {
    if (r.start > time) return r.start;
  }
  return null;
}

export function useRehearsalEngine({
  wavesurferRef,
  segments,
  mode,
  selectedCharacter,
  findSegmentIndex,
  findNextUserSegmentIndex,
  isInUserSegment,
  waitingForUser,
  setWaitingForUser,
  setCurrentTime,
  setCurrentSegmentIndex,
  setIsPlaying,
  cuingRef,
  cueEndRef,
  setIsCueing,
  onCueEndRef,
  activeRanges,
}: UseRehearsalEngineOptions) {

  // RAF tick for high-frequency rehearse mode checking
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    let rafId: number;
    const LOOKAHEAD = 0.08;

    const tick = () => {
      if (ws && !ws.getDecodedData()) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediaEl = (ws as any).getMediaElement?.() ?? (ws as any).media;
      const isPaused = mediaEl ? mediaEl.paused : true;

      if (!isPaused) {
        const time = ws.getCurrentTime();
        setCurrentTime(time);
        const segIdx = findSegmentIndex(time);
        setCurrentSegmentIndex(segIdx);

        // Cue mode: stop at segment end
        if (cuingRef.current && time >= cueEndRef.current) {
          ws.pause();
          ws.setTime(cueEndRef.current);
          cuingRef.current = false;
          setIsCueing(false);
          setIsPlaying(false);
          // If there's a pending action after cue (e.g. shuffle advance), run it
          const onEnd = onCueEndRef.current;
          if (onEnd) {
            onCueEndRef.current = null;
            onEnd();
          }
          rafId = requestAnimationFrame(tick);
          return;
        }

        // Active range boundary check: if time exceeds current range end, jump to next range or loop
        if (activeRanges && !cuingRef.current) {
          const rangeEnd = findCurrentRangeEnd(time, activeRanges);
          if (rangeEnd !== null && time >= rangeEnd) {
            // Past the end of current range - find next range or loop to first
            const nextStart = findNextRangeStart(rangeEnd, activeRanges);
            if (nextStart !== null) {
              ws.setTime(nextStart);
            } else {
              // Loop back to the start of the first active range
              ws.pause();
              ws.setTime(activeRanges[0].start);
              ws.setMuted(false);
              setIsPlaying(false);
            }
            rafId = requestAnimationFrame(tick);
            return;
          }
          // If time is outside all ranges (e.g. gap between ranges), jump to next range
          if (!isTimeInRanges(time, activeRanges)) {
            const nextStart = findNextRangeStart(time, activeRanges);
            if (nextStart !== null) {
              ws.setTime(nextStart);
            } else {
              ws.pause();
              ws.setTime(activeRanges[0].start);
              ws.setMuted(false);
              setIsPlaying(false);
            }
            rafId = requestAnimationFrame(tick);
            return;
          }
        }

        // Rehearse or Shuffle mode: mute during user segments (unless cueing)
        if ((mode === AudioMode.REHEARSE || mode === AudioMode.SHUFFLE) && selectedCharacter && !cuingRef.current) {
          ws.setMuted(isInUserSegment(time));
        }

        // Rehearse mode: pause before individual user segments
        if ((mode === AudioMode.REHEARSE || mode === AudioMode.SHUFFLE) && selectedCharacter && !cuingRef.current && !waitingForUser) {
          const nextUserIdx = findNextUserSegmentIndex(Math.max(0, segIdx));
          if (nextUserIdx >= 0) {
            const userSeg = segments[nextUserIdx];
            if (time >= userSeg.start - LOOKAHEAD && time < userSeg.end) {
              ws.pause();
              ws.setMuted(false);
              ws.setTime(userSeg.start);
              setIsPlaying(false);
              setWaitingForUser(true);
              setCurrentSegmentIndex(nextUserIdx);
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (ws) ws.setMuted(false);
    };
  }, [
    wavesurferRef,
    segments,
    mode,
    selectedCharacter,
    waitingForUser,
    findSegmentIndex,
    findNextUserSegmentIndex,
    isInUserSegment,
    setWaitingForUser,
    setCurrentTime,
    setCurrentSegmentIndex,
    setIsPlaying,
    cuingRef,
    cueEndRef,
    setIsCueing,
    onCueEndRef,
    activeRanges,
  ]);

  // Reset waiting state when mode or character changes
  useEffect(() => {
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [mode, selectedCharacter, setWaitingForUser, cuingRef, setIsCueing]);
}
