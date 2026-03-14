import { useCallback } from 'react';
import type { Segment, Character } from '../../../core/types';

export function useAudioSegments(segments: Segment[], selectedCharacter: Character | null) {
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

  return {
    findSegmentIndex,
    isUserSegment,
    findNextUserSegmentIndex,
    isInUserSegment,
  };
}
