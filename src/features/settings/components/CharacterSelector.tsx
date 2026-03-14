import type { Character } from '../../../core/types';
import { GameCharacter } from '../../../core/enums';

interface CharacterSelectorProps {
  selected: Character | null;
  onChange: (character: Character) => void;
}

const characters: Character[] = [GameCharacter.TED, GameCharacter.PEGGY];

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
