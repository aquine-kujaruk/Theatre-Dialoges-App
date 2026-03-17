import { useState, useRef, useCallback, useEffect } from 'react';
import type { Segment, Mode, Character, TimeRange, SrsRecord } from '../../../core/types';
import { AudioMode } from '../../../core/enums';
import { useWaveSurfer } from './useWaveSurfer';
import { useAudioSegments } from './useAudioSegments';
import { useRehearsalEngine } from './useRehearsalEngine';
import { useSrsEngine } from './useSrsEngine';

interface UseAudioPlayerOptions {
  segments: Segment[];
  mode: Mode;
  selectedCharacter: Character | null;
  audioUrl: string;
  activeRanges: TimeRange[] | null;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  isCueing: boolean;
  shuffleActive: boolean;
  currentTime: number;
  duration: number;
  currentSegmentIndex: number;
  waitingForUser: boolean;
  srsRecords: Record<number, SrsRecord>;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  cue: () => void;
  handleHard: () => void;
  handleGood: () => void;
  handleEasy: () => void;
}

// Clamp a time to stay within active ranges. If outside all ranges, snap to nearest range boundary.
function clampToRanges(time: number, ranges: TimeRange[]): number {
  for (const r of ranges) {
    if (time >= r.start && time <= r.end) return time;
  }
  // Find nearest range
  let closest = ranges[0].start;
  let minDist = Math.abs(time - ranges[0].start);
  for (const r of ranges) {
    const distStart = Math.abs(time - r.start);
    const distEnd = Math.abs(time - r.end);
    if (distStart < minDist) { closest = r.start; minDist = distStart; }
    if (distEnd < minDist) { closest = r.end; minDist = distEnd; }
  }
  return closest;
}


export function useAudioPlayer({
  segments,
  mode,
  selectedCharacter,
  audioUrl,
  activeRanges,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [isCueing, setIsCueing] = useState(false);
  const [shuffleActive, setShuffleActive] = useState(false);

  const cuingRef = useRef(false);
  const cueEndRef = useRef(0);
  const onCueEndRef = useRef<(() => void) | null>(null);

  const {
    findSegmentIndex,
    isUserSegment,
    findNextUserSegmentIndex,
    isInUserSegment,
  } = useAudioSegments(segments, selectedCharacter);

  const {
    records: srsRecords,
    getNextDueSegmentIndex,
    markHard,
    markGood,
    markEasy,
  } = useSrsEngine(segments, selectedCharacter);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    setCurrentSegmentIndex(findSegmentIndex(time));
  }, [findSegmentIndex]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (!cuingRef.current && wavesurferRef.current) {
      wavesurferRef.current.setMuted(false);
    }
  }, []);

  const handleFinish = useCallback(() => {
    setIsPlaying(false);
    if (wavesurferRef.current) {
      wavesurferRef.current.setMuted(false);
    }
    cuingRef.current = false;
    setIsCueing(false);
  }, []);

  const { wavesurferRef, duration, isLoading } = useWaveSurfer({
    audioUrl,
    onTimeUpdate: handleTimeUpdate,
    onPlay: handlePlay,
    onPause: handlePause,
    onFinish: handleFinish,
  });

  useRehearsalEngine({
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
  });

  // In rehearse mode, if a target time lands inside a user segment, snap to its end
  const adjustTimeForRehearsal = useCallback(
    (time: number): number => {
      if (mode !== AudioMode.REHEARSE || !selectedCharacter) return time;
      const idx = findSegmentIndex(time);
      if (idx < 0) return time;
      const seg = segments[idx];
      if (seg.speaker === selectedCharacter && time < seg.end) {
        return seg.end;
      }
      return time;
    },
    [mode, selectedCharacter, segments, findSegmentIndex],
  );

  const constrainTime = useCallback(
    (time: number): number => {
      if (!activeRanges) return time;
      return clampToRanges(time, activeRanges);
    },
    [activeRanges],
  );

  const togglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (waitingForUser && (mode === AudioMode.REHEARSE || mode === AudioMode.SHUFFLE)) {
      // Skip current user segment and resume
      const seg = segments[currentSegmentIndex];
      if (seg) {
        ws.setTime(seg.end);
        ws.setMuted(false);
        setWaitingForUser(false);
        if (mode !== AudioMode.SHUFFLE) {
          ws.play();
        }
      }
      return;
    }

    if (!isPlaying) {
      if (mode === AudioMode.SHUFFLE && selectedCharacter) {
        // In shuffle mode, play the next due segment's cue
        const nextIdx = getNextDueSegmentIndex();
        if (nextIdx >= 0) {
          const targetSeg = segments[nextIdx];

          let cueStart = Math.max(0, targetSeg.start - 5);
          for (let i = nextIdx - 1; i >= 0; i--) {
            if (segments[i].speaker !== selectedCharacter) {
              cueStart = segments[i].start;
              break;
            }
          }

          setShuffleActive(true);
          ws.setTime(cueStart);
          ws.setMuted(false);
          ws.play();
        }
        return;
      }

      if (mode === AudioMode.REHEARSE && selectedCharacter) {
        const current = ws.getCurrentTime();
        const adjusted = adjustTimeForRehearsal(current);
        if (adjusted !== current) {
          ws.setTime(adjusted);
          ws.setMuted(false);
        }
      }

      // If we have active ranges and current time is outside them, jump to the start of the nearest range
      if (activeRanges) {
        const current = ws.getCurrentTime();
        const constrained = constrainTime(current);
        if (constrained !== current) {
          ws.setTime(constrained);
        }
      }

      ws.play();
    } else {
      ws.pause();
    }
  }, [wavesurferRef, waitingForUser, mode, selectedCharacter, segments, currentSegmentIndex, isPlaying, adjustTimeForRehearsal, getNextDueSegmentIndex, activeRanges, constrainTime]);

  const seek = useCallback((time: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const constrained = constrainTime(time);
    ws.setTime(constrained);
    ws.setMuted(false);
    setCurrentTime(constrained);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [wavesurferRef, constrainTime]);

  const skipForward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    let newTime = Math.min(ws.getCurrentTime() + 15, duration || ws.getDuration());
    newTime = adjustTimeForRehearsal(newTime);
    newTime = constrainTime(newTime);
    ws.setTime(newTime);
    ws.setMuted(false);
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [wavesurferRef, duration, adjustTimeForRehearsal, constrainTime]);

  const skipBack = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    let newTime = Math.max(ws.getCurrentTime() - 15, 0);
    newTime = adjustTimeForRehearsal(newTime);
    newTime = constrainTime(newTime);
    ws.setTime(newTime);
    ws.setMuted(false);
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [wavesurferRef, adjustTimeForRehearsal, constrainTime]);

  const cue = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws || currentSegmentIndex < 0) return;

    const seg = segments[currentSegmentIndex];
    if (!seg || !isUserSegment(seg)) return;

    cuingRef.current = true;
    setIsCueing(true);
    cueEndRef.current = seg.end;
    ws.setMuted(false);
    ws.setTime(seg.start);
    ws.play();
  }, [wavesurferRef, currentSegmentIndex, segments, isUserSegment]);

  const handleSrsAction = useCallback((action: (id: number) => void) => {
    const ws = wavesurferRef.current;
    if (!ws || mode !== AudioMode.SHUFFLE || !waitingForUser) return;

    const seg = segments[currentSegmentIndex];
    if (seg) {
      action(seg.id);

      // First: reveal and play the current segment (cue it)
      setWaitingForUser(false);
      cuingRef.current = true;
      setIsCueing(true);
      cueEndRef.current = seg.end;
      ws.setMuted(false);
      ws.setTime(seg.start);

      // After cue finishes, pause briefly then auto-advance to next shuffle segment
      onCueEndRef.current = () => {
        setTimeout(() => {
          const nextIdx = getNextDueSegmentIndex();
          if (nextIdx >= 0) {
            const targetSeg = segments[nextIdx];
            let cueStart = Math.max(0, targetSeg.start - 5);
            for (let i = nextIdx - 1; i >= 0; i--) {
              if (segments[i].speaker !== selectedCharacter) {
                cueStart = segments[i].start;
                break;
              }
            }
            ws.setTime(cueStart);
            ws.setMuted(false);
            ws.play();
          }
        }, 1500);
      };

      ws.play();
    }
  }, [wavesurferRef, mode, waitingForUser, segments, currentSegmentIndex, getNextDueSegmentIndex, selectedCharacter, setIsCueing]);

  // Reset shuffleActive when leaving shuffle mode
  useEffect(() => {
    if (mode !== AudioMode.SHUFFLE) setShuffleActive(false);
  }, [mode]);

  const handleHard = useCallback(() => handleSrsAction(markHard), [handleSrsAction, markHard]);
  const handleGood = useCallback(() => handleSrsAction(markGood), [handleSrsAction, markGood]);
  const handleEasy = useCallback(() => handleSrsAction(markEasy), [handleSrsAction, markEasy]);

  return {
    isPlaying,
    isLoading,
    isCueing,
    shuffleActive,
    currentTime,
    duration,
    currentSegmentIndex,
    waitingForUser,
    srsRecords,
    togglePlay,
    seek,
    skipForward,
    skipBack,
    cue,
    handleHard,
    handleGood,
    handleEasy,
  };
}
