export const AudioMode = {
  LISTEN: 'listen',
  REHEARSE: 'rehearse',
  SHUFFLE: 'shuffle',
} as const;

export type AudioMode = typeof AudioMode[keyof typeof AudioMode];

export const GameCharacter = {
  PEGGY: 'Peggy',
  TED: 'Ted',
  BREWSTER: 'Brewster',
  BILLY: 'Billy',
  WINKIE: 'Winkie',
} as const;

export type GameCharacter = typeof GameCharacter[keyof typeof GameCharacter];

export const AssetPath = {
  SCREENPLAY: 'assets/screenplay.json',
  AUDIO: 'assets/audio.mp3',
} as const;

export type AssetPath = typeof AssetPath[keyof typeof AssetPath];
