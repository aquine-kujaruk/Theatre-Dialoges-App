import { useState, useEffect, useMemo } from 'react';
import type { Segment, Mode, Character } from './core/types';
import { useAudioPlayer } from './features/player/hooks/useAudioPlayer';
import { ModeSelector } from './features/settings/components/ModeSelector';
import { CharacterSelector } from './features/settings/components/CharacterSelector';
import { LineDisplay } from './features/script/components/LineDisplay';
import { ProgressBar } from './features/player/components/ProgressBar';
import { PlayerControls } from './features/player/components/PlayerControls';
import { AudioMode, GameCharacter, AssetPath } from './core/enums';
import './styles/global.css';

function App() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [mode, setMode] = useState<Mode>(AudioMode.LISTEN);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}${AssetPath.SCREENPLAY}`)
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
    audioUrl: `${import.meta.env.BASE_URL}${AssetPath.AUDIO}`,
  });

  const userSegments = useMemo(() => {
    if (mode !== AudioMode.REHEARSE || !selectedCharacter) return undefined;
    return segments.filter((s) => s.speaker === selectedCharacter);
  }, [segments, mode, selectedCharacter]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === AudioMode.REHEARSE && !selectedCharacter) {
      setSelectedCharacter(GameCharacter.TED);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <ModeSelector mode={mode} onChange={handleModeChange} />
        {mode === AudioMode.REHEARSE && (
          <CharacterSelector selected={selectedCharacter} onChange={setSelectedCharacter} />
        )}
      </header>

      <main className="app-main">
        <LineDisplay
          segments={segments}
          currentSegmentIndex={currentSegmentIndex}
          waitingForUser={waitingForUser}
          isCueing={isCueing}
          isRehearsing={mode === AudioMode.REHEARSE}
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
