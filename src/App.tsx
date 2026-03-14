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
    audioRef,
    isPlaying,
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
  } = useAudioPlayer({ segments, mode, selectedCharacter });

  const userSegments = useMemo(() => {
    if (mode !== 'rehearse' || !selectedCharacter) return undefined;
    return segments.filter((s) => s.speaker === selectedCharacter);
  }, [segments, mode, selectedCharacter]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'rehearse' && !selectedCharacter) {
      setSelectedCharacter('Peggy');
    }
  };

  return (
    <div className="app">
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}assets/audio.mp3`} preload="metadata" />

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
        />
      </main>

      <footer className="app-footer">
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          userSegments={userSegments}
        />
        <PlayerControls
          isPlaying={isPlaying}
          waitingForUser={waitingForUser}
          showCue={mode === 'rehearse'}
          onTogglePlay={togglePlay}
          onSkipBack={skipBack}
          onSkipForward={skipForward}
          onCue={cue}
        />
      </footer>
    </div>
  );
}

export default App;
