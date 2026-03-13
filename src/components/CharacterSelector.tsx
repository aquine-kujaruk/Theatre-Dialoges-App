import type { Character } from '../types';

interface CharacterSelectorProps {
  selected: Character | null;
  onChange: (character: Character) => void;
}

const characters: Character[] = ['Peggy', 'Ted'];

export function CharacterSelector({ selected, onChange }: CharacterSelectorProps) {
  return (
    <div className="character-selector">
      <span className="character-label">Your character:</span>
      <div className="character-buttons">
        {characters.map((char) => (
          <button
            key={char}
            className={`character-btn ${selected === char ? 'active' : ''}`}
            onClick={() => onChange(char)}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
