import { AudioMode, GameCharacter } from './enums';

export interface Segment {
  id: number;
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export type Mode = AudioMode;
export type Character = GameCharacter;

export interface SrsRecord {
  segmentId: number;
  box: number; // 0=Hard, 1=Good, 2=Easy
  nextDate: number; // timestamp
}

export interface Bookmark {
  id: number;
  label: string;
  startSegmentId: number;
  endSegmentId: number;
}

export interface TimeRange {
  start: number;
  end: number;
}
