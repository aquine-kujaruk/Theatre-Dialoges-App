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

