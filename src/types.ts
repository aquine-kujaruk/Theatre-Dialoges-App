export interface Segment {
  id: number;
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export type Mode = 'listen' | 'rehearse';

export type Character = 'Peggy' | 'Ted';
