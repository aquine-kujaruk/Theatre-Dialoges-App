import { useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { Segment, Mode, Character } from '../../../core/types';
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
          rafId = requestAnimationFrame(tick);
          return;
        }

        // Rehearse mode: mute during user segments (unless cueing)
        if (mode === AudioMode.REHEARSE && selectedCharacter && !cuingRef.current) {
          ws.setMuted(isInUserSegment(time));
        }

        // Rehearse mode: pause before individual user segments
        if (mode === AudioMode.REHEARSE && selectedCharacter && !cuingRef.current && !waitingForUser) {
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
  ]);

  // Reset waiting state when mode or character changes
  useEffect(() => {
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [mode, selectedCharacter, setWaitingForUser, cuingRef, setIsCueing]);
}
