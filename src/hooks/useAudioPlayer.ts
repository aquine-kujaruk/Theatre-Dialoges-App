import { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import WebAudioPlayer from 'wavesurfer.js/dist/webaudio.js';
import type { Segment, Mode, Character } from '../types';

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
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [isCueing, setIsCueing] = useState(false);
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

  // Keep a ref in sync so event handlers registered once always use the latest version
  const findSegmentIndexRef = useRef(findSegmentIndex);
  findSegmentIndexRef.current = findSegmentIndex;

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

  // Check if a time falls inside a user segment
  const isInUserSegment = useCallback(
    (time: number): boolean => {
      if (!selectedCharacter) return false;
      const idx = findSegmentIndex(time);
      if (idx < 0) return false;
      const seg = segments[idx];
      return seg.speaker === selectedCharacter && time < seg.end;
    },
    [segments, selectedCharacter, findSegmentIndex],
  );

  // WaveSurfer initialization and cleanup
  useEffect(() => {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;';
    document.body.appendChild(div);
    containerRef.current = div;

    const ws = WaveSurfer.create({
      container: div,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      media: new WebAudioPlayer() as any,
      height: 0,
      waveColor: 'transparent',
      progressColor: 'transparent',
      cursorColor: 'transparent',
      interact: false,
    });

    wavesurferRef.current = ws;

    ws.on('ready', (dur: number) => {
      setDuration(dur);
      setIsLoading(false);
    });

    ws.on('play', () => setIsPlaying(true));

    ws.on('pause', () => {
      setIsPlaying(false);
      if (!cuingRef.current) ws.setMuted(false);
    });

    ws.on('finish', () => {
      setIsPlaying(false);
      ws.setMuted(false);
      cuingRef.current = false;
      setIsCueing(false);
    });

    ws.on('timeupdate', (time: number) => {
      setCurrentTime(time);
      setCurrentSegmentIndex(findSegmentIndexRef.current(time));
    });

    ws.load(audioUrl);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
      containerRef.current = null;
    };
  }, [audioUrl]);

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
        if (mode === 'rehearse' && selectedCharacter && !cuingRef.current) {
          ws.setMuted(isInUserSegment(time));
        }

        // Rehearse mode: pause before individual user segments
        if (mode === 'rehearse' && selectedCharacter && !cuingRef.current && !waitingForUser) {
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
  }, [segments, mode, selectedCharacter, waitingForUser, findSegmentIndex, findNextUserSegmentIndex, isInUserSegment]);

  // Reset waiting state when mode or character changes
  useEffect(() => {
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [mode, selectedCharacter]);

  // In rehearse mode, if a target time lands inside a user segment, snap to its end
  const adjustTimeForRehearsal = useCallback(
    (time: number): number => {
      if (mode !== 'rehearse' || !selectedCharacter) return time;
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

    if (waitingForUser && mode === 'rehearse') {
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
      if (mode === 'rehearse' && selectedCharacter) {
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
  }, [waitingForUser, mode, selectedCharacter, segments, currentSegmentIndex, isPlaying, adjustTimeForRehearsal]);

  const seek = useCallback((time: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.setTime(time);
    ws.setMuted(false);
    setCurrentTime(time);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, []);

  const skipForward = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    let newTime = Math.min(ws.getCurrentTime() + 15, ws.getDuration());
    newTime = adjustTimeForRehearsal(newTime);
    ws.setTime(newTime);
    ws.setMuted(false);
    setCurrentTime(newTime);
    setWaitingForUser(false);
    cuingRef.current = false;
    setIsCueing(false);
  }, [adjustTimeForRehearsal]);

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
  }, [adjustTimeForRehearsal]);

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
  }, [currentSegmentIndex, segments, isUserSegment]);

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
