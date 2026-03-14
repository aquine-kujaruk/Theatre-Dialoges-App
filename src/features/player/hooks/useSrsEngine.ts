import { useState, useCallback, useEffect } from 'react';
import type { Segment, Character, SrsRecord } from '../../../core/types';

const STORAGE_KEY = 'theatre_srs_data';

// SRS Intervals in milliseconds
const INTERVALS = {
  0: 0, // Hard: Due immediately
  1: 24 * 60 * 60 * 1000, // Good: Due in 1 day
  2: 4 * 24 * 60 * 60 * 1000, // Easy: Due in 4 days
};

export function useSrsEngine(segments: Segment[], selectedCharacter: Character | null) {
  const [records, setRecords] = useState<Record<number, SrsRecord>>({});

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecords(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load SRS data', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage whenever records change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save SRS data', e);
    }
  }, [records, isLoaded]);

  // Update a segment's SRS box
  const updateSegment = useCallback(
    (segmentId: number, newBox: 0 | 1 | 2) => {
      setRecords((prev) => {
        const now = Date.now();
        const nextDate = now + INTERVALS[newBox];
        return {
          ...prev,
          [segmentId]: {
            segmentId,
            box: newBox,
            nextDate,
          },
        };
      });
    },
    []
  );

  const markHard = useCallback((id: number) => updateSegment(id, 0), [updateSegment]);
  const markGood = useCallback((id: number) => updateSegment(id, 1), [updateSegment]);
  const markEasy = useCallback((id: number) => updateSegment(id, 2), [updateSegment]);

  // Get the next due segment for the selected character
  const getNextDueSegmentIndex = useCallback((): number => {
    if (!selectedCharacter || segments.length === 0) return -1;

    const now = Date.now();
    const userSegments = segments
      .map((seg, idx) => ({ seg, idx }))
      .filter(({ seg }) => seg.speaker === selectedCharacter);

    if (userSegments.length === 0) return -1;

    // 1. Find segments that are due (or have never been studied)
    const dueSegments = userSegments.filter(({ seg }) => {
      const record = records[seg.id];
      if (!record) return true; // Never studied => Due
      return now >= record.nextDate; // Time passed => Due
    });

    // If there is a due segment, pick a random one
    // We shuffle to avoid predictability
    if (dueSegments.length > 0) {
      const randomIndex = Math.floor(Math.random() * dueSegments.length);
      return dueSegments[randomIndex].idx;
    }

    // 2. If no segments are due, pick a random segment anyway (fallback)
    const randomIndex = Math.floor(Math.random() * userSegments.length);
    return userSegments[randomIndex].idx;
  }, [segments, selectedCharacter, records]);

  return {
    records,
    getNextDueSegmentIndex,
    markHard,
    markGood,
    markEasy,
  };
}
