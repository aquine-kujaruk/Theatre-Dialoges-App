interface PlayerControlsProps {
  isPlaying: boolean;
  waitingForUser: boolean;
  showCue: boolean;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onCue: () => void;
}

export function PlayerControls({
  isPlaying,
  waitingForUser,
  showCue,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onCue,
}: PlayerControlsProps) {
  return (
    <div className="player-controls">
      {showCue && waitingForUser && (
        <button className="cue-btn" onClick={onCue}>
          Cue
        </button>
      )}
      <div className="controls-row">
        <button className="control-btn" onClick={onSkipBack} aria-label="Skip back 15 seconds">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">15</text>
          </svg>
        </button>

        <button
          className={`play-btn ${waitingForUser ? 'resume' : ''}`}
          onClick={onTogglePlay}
          aria-label={waitingForUser ? 'Skip and continue' : isPlaying ? 'Pause' : 'Play'}
        >
          {waitingForUser ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 4l10 8-10 8V4z"/>
              <rect x="17" y="4" width="3" height="16"/>
            </svg>
          ) : isPlaying ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button className="control-btn" onClick={onSkipForward} aria-label="Skip forward 15 seconds">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">15</text>
          </svg>
        </button>
      </div>
    </div>
  );
}
