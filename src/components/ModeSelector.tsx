import type { Mode } from '../types';

interface ModeSelectorProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <button
        className={`mode-btn ${mode === 'listen' ? 'active' : ''}`}
        onClick={() => onChange('listen')}
      >
        Listen
      </button>
      <button
        className={`mode-btn ${mode === 'rehearse' ? 'active' : ''}`}
        onClick={() => onChange('rehearse')}
      >
        Rehearse
      </button>
    </div>
  );
}
