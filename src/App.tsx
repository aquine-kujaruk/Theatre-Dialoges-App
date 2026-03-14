import { useState, useEffect, useMemo } from 'react';
import type { Segment, Mode, Character } from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { ModeSelector } from './components/ModeSelector';
import { CharacterSelector } from './components/CharacterSelector';
import { LineDisplay } from './components/LineDisplay';
import { ProgressBar } from './components/ProgressBar';
import { PlayerControls } from './components/PlayerControls';
import './styles/global.css';

function App() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [mode, setMode] = useState<Mode>('listen');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}assets/screenplay.json`)
      .then((res) => res.json())
      .then((data: Segment[]) => {
        setSegments(data.sort((a, b) => a.start - b.start));
      });
  }, []);

  const {
    isPlaying,
    isLoading,
    isCueing,
    currentTime,
    duration,
    currentSegmentIndex,
    waitingForUser,
    togglePlay,
    seek,
    skipForward,
    skipBack,
    cue,
  } = useAudioPlayer({
    segments,
    mode,
    selectedCharacter,
    audioUrl: `${import.meta.env.BASE_URL}assets/audio.mp3`,
  });

  const userSegments = useMemo(() => {
    if (mode !== 'rehearse' || !selectedCharacter) return undefined;
    return segments.filter((s) => s.speaker === selectedCharacter);
  }, [segments, mode, selectedCharacter]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'rehearse' && !selectedCharacter) {
      setSelectedCharacter('Ted');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <ModeSelector mode={mode} onChange={handleModeChange} />
        {mode === 'rehearse' && (
          <CharacterSelector selected={selectedCharacter} onChange={setSelectedCharacter} />
        )}
      </header>

      <main className="app-main">
        <LineDisplay
          segments={segments}
          currentSegmentIndex={currentSegmentIndex}
          waitingForUser={waitingForUser}
          isCueing={isCueing}
          isRehearsing={mode === 'rehearse'}
          selectedCharacter={selectedCharacter}
          onSeek={seek}
          onCue={cue}
        />
      </main>

      <footer className="app-footer">
        {isLoading ? (
          <div className="loading-audio">Decoding audio…</div>
        ) : (
          <>
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
              userSegments={userSegments}
            />
            <PlayerControls
              isPlaying={isPlaying}
              waitingForUser={waitingForUser}
              onTogglePlay={togglePlay}
              onSkipBack={skipBack}
              onSkipForward={skipForward}
            />
          </>
        )}
      </footer>
    </div>
  );
}

export default App;
