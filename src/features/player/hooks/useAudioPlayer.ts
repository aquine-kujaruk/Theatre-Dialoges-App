import { useState, useRef, useCallback } from 'react';
import type { Segment, Mode, Character } from '../../../core/types';
import { AudioMode } from '../../../core/enums';
import { useWaveSurfer } from './useWaveSurfer';
import { useAudioSegments } from './useAudioSegments';
import { useRehearsalEngine } from './useRehearsalEngine';

interface UseAudioPlayerOptions {
  segments: Segment[];
  mode: Mode;
  selectedCharacter: Character | null;
  audioUrl: string;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  isCueing: boolean;
  currentTime: number;
  duration: number;
  currentSegmentIndex: number;
  waitingForUser: boolean;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  cue: () => void;
}

export function useAudioPlayer({
  segments,
  mode,
  selectedCharacter,
  audioUrl,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [isCueing, setIsCueing] = useState(false);
  
  const cuingRef = useRef(false);
  const cueEndRef = useRef(0);

  const {
    findSegmentIndex,
    isUserSegment,
    findNextUserSegmentIndex,
    isInUserSegment,
  } = useAudioSegments(segments, selectedCharacter);

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

  const togglePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (waitingForUser && mode === AudioMode.REHEARSE) {
      // Skip current user segment and resume
      const seg = segments[currentSegmentIndex];
      if (seg) {
        ws.setTime(seg.end);
        ws.setMuted(false);
        setWaitingForUser(false);
        ws.play();
      }
      return;
    }

    if (!isPlaying) {
      if (mode === AudioMode.REHEARSE && selectedCharacter) {
        const current = ws.getCurrentTime();
        const adjusted = adjustTimeForRehearsal(current);
        if (adjusted !== current) {
          ws.setTime(adjusted);
          ws.setMuted(false);
        }
      }
      ws.play();
    } else {
      ws.pause();
    }
  }, [wavesurferRef, waitingForUser, mode, selectedCharacter, segments, currentSegmentIndex, isPlaying, adjustTimeForRehearsal]);

  const seek = useCallback((time: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.setTime(time);
    ws.setMuted(false);
    setCurrentTime(time);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [wavesurferRef]);

  const skipForward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    let newTime = Math.min(ws.getCurrentTime() + 15, duration || ws.getDuration());
    newTime = adjustTimeForRehearsal(newTime);
    ws.setTime(newTime);
    ws.setMuted(false);
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [wavesurferRef, duration, adjustTimeForRehearsal]);

  const skipBack = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    let newTime = Math.max(ws.getCurrentTime() - 15, 0);
    newTime = adjustTimeForRehearsal(newTime);
    ws.setTime(newTime);
    ws.setMuted(false);
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [wavesurferRef, adjustTimeForRehearsal]);

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

  return {
    isPlaying,
    isLoading,
    isCueing,
    currentTime,
    duration,
    currentSegmentIndex,
    waitingForUser,
    togglePlay,
    seek,
    skipForward,
    skipBack,
    cue,
  };
}
