import type { Mode } from '../../../core/types';
import { AudioMode } from '../../../core/enums';

interface ModeSelectorProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === AudioMode.LISTEN ? 'active' : ''}`}
        onClick={() => onChange(AudioMode.LISTEN)}
      >
        Listen
      </button>
      <button
        className={`mode-btn ${mode === AudioMode.REHEARSE ? 'active' : ''}`}
        onClick={() => onChange(AudioMode.REHEARSE)}
      >
        Rehearse
      </button>
    </div>
  );
}
