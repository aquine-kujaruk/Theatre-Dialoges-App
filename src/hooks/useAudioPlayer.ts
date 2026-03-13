import { useRef, useState, useEffect, useCallback } from 'react';
import type { Segment, Mode, Character } from '../types';

interface UseAudioPlayerOptions {
  segments: Segment[];
  mode: Mode;
  selectedCharacter: Character | null;
}

interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
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
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const cuingRef = useRef(false);
  const cueEndRef = useRef(0);

  // Find the segment index for a given time
  const findSegmentIndex = useCallback(
    (time: number): number => {
      for (let i = segments.length - 1; i >= 0; i--) {
        if (time >= segments[i].start) {
          return i;
        }
      }
      return -1;
    },
    [segments],
  );

  // Check if a segment belongs to the user's character
  const isUserSegment = useCallback(
    (segment: Segment): boolean => {
      return !!selectedCharacter && segment.speaker === selectedCharacter;
    },
    [selectedCharacter],
  );

  // Find the next user segment at or after the given index
  const findNextUserSegmentIndex = useCallback(
    (fromIndex: number): number => {
      for (let i = fromIndex; i < segments.length; i++) {
        if (isUserSegment(segments[i])) {
          return i;
        }
      }
      return -1;
    },
    [segments, isUserSegment],
  );

  // timeupdate handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      const segIdx = findSegmentIndex(time);
      setCurrentSegmentIndex(segIdx);

      // Cue mode: stop at segment end
      if (cuingRef.current && time >= cueEndRef.current) {
        audio.pause();
        audio.currentTime = cueEndRef.current;
        cuingRef.current = false;
        setIsPlaying(false);
        return;
      }

      // Rehearse mode: pause at user segments
      if (mode === 'rehearse' && selectedCharacter && !cuingRef.current && !waitingForUser) {
        const nextUserIdx = findNextUserSegmentIndex(Math.max(0, segIdx));
        if (nextUserIdx >= 0) {
          const userSeg = segments[nextUserIdx];
          if (time >= userSeg.start && time < userSeg.end) {
            audio.pause();
            audio.currentTime = userSeg.start;
            setIsPlaying(false);
            setWaitingForUser(true);
            setCurrentSegmentIndex(nextUserIdx);
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      cuingRef.current = false;
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [segments, mode, selectedCharacter, waitingForUser, findSegmentIndex, findNextUserSegmentIndex]);

  // Reset waiting state when mode or character changes
  useEffect(() => {
    setWaitingForUser(false);
    cuingRef.current = false;
  }, [mode, selectedCharacter]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (waitingForUser && mode === 'rehearse') {
      // Skip user segment and resume
      const userSeg = segments[currentSegmentIndex];
      if (userSeg) {
        audio.currentTime = userSeg.end;
        setWaitingForUser(false);
        audio.play();
      }
      return;
    }

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [waitingForUser, mode, segments, currentSegmentIndex]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    setWaitingForUser(false);
    cuingRef.current = false;
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.min(audio.currentTime + 15, audio.duration);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
  }, []);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(audio.currentTime - 15, 0);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
  }, []);

  const cue = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || currentSegmentIndex < 0) return;

    const seg = segments[currentSegmentIndex];
    if (!seg || !isUserSegment(seg)) return;

    cuingRef.current = true;
    cueEndRef.current = seg.end;
    audio.currentTime = seg.start;
    audio.play();
  }, [currentSegmentIndex, segments, isUserSegment]);

  return {
    audioRef,
    isPlaying,
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
