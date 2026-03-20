import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Segment, Mode, Character, TimeRange } from './core/types';
import { useAudioPlayer } from './features/player/hooks/useAudioPlayer';
import { ModeSelector } from './features/settings/components/ModeSelector';
import { CharacterSelector } from './features/settings/components/CharacterSelector';
import { BookmarkToggle } from './features/bookmarks/components/BookmarkToggle';
import { BookmarkPanel } from './features/bookmarks/components/BookmarkPanel';
import { StatsToggle } from './features/stats/components/StatsToggle';
import { StatsPanel } from './features/stats/components/StatsPanel';
import { LineDisplay } from './features/script/components/LineDisplay';
import { ProgressBar } from './features/player/components/ProgressBar';
import { PlayerControls } from './features/player/components/PlayerControls';
import { OnboardingModal } from './features/onboarding/components/OnboardingModal';
import { AudioMode, GameCharacter, AssetPath } from './core/enums';
import { BOOKMARKS } from './core/bookmarks';
import { initAnalytics } from './lib/firebase';
import { getActorName, getDeviceId, syncUserProperties } from './lib/identity';
import {
  trackModeChanged,
  trackPlaybackAction,
  trackBookmarkInteraction,
  trackSectionEnter,
  trackSectionExit,
  trackSessionEnd,
} from './lib/analytics';
import './styles/global.css';

function App() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [mode, setMode] = useState<Mode>(AudioMode.LISTEN);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [activeBookmarkIds, setActiveBookmarkIds] = useState<Set<number>>(new Set());
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(() => !getActorName());
  const sessionStartRef = useRef(Date.now());

  // Initialize Firebase Analytics + device ID + user properties
  useEffect(() => {
    getDeviceId(); // Ensure device_id exists
    initAnalytics().then(() => {
      syncUserProperties();
    });
  }, []);

  // Track session_end on page unload
  useEffect(() => {
    const start = sessionStartRef.current;
    const handleUnload = () => {
      trackSessionEnd((Date.now() - start) / 1000);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Track section_enter / section_exit for panels
  const panelOpenTimeRef = useRef<{ name: string; time: number } | null>(null);

  useEffect(() => {
    if (bookmarkPanelOpen) {
      panelOpenTimeRef.current = { name: 'marcadores', time: Date.now() };
      trackSectionEnter('marcadores');
    } else if (panelOpenTimeRef.current?.name === 'marcadores') {
      trackSectionExit('marcadores', (Date.now() - panelOpenTimeRef.current.time) / 1000);
      panelOpenTimeRef.current = null;
    }
  }, [bookmarkPanelOpen]);

  useEffect(() => {
    if (statsPanelOpen) {
      panelOpenTimeRef.current = { name: 'stats', time: Date.now() };
      trackSectionEnter('stats');
    } else if (panelOpenTimeRef.current?.name === 'stats') {
      trackSectionExit('stats', (Date.now() - panelOpenTimeRef.current.time) / 1000);
      panelOpenTimeRef.current = null;
    }
  }, [statsPanelOpen]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}${AssetPath.SCREENPLAY}`)
      .then((res) => res.json())
      .then((data: Segment[]) => {
        setSegments(data.sort((a, b) => a.start - b.start));
      });
  }, []);

  const toggleBookmark = useCallback((id: number) => {
    trackBookmarkInteraction('filter', id);
    setActiveBookmarkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Derive active segments and time ranges from selected bookmarks
  const { activeSegments, activeRanges } = useMemo(() => {
    if (activeBookmarkIds.size === 0) {
      return { activeSegments: segments, activeRanges: null };
    }

    const activeBookmarks = BOOKMARKS.filter((bm) => activeBookmarkIds.has(bm.id));
    const activeSegmentIds = new Set<number>();
    const ranges: TimeRange[] = [];

    for (const bm of activeBookmarks) {
      for (let id = bm.startSegmentId; id <= bm.endSegmentId; id++) {
        activeSegmentIds.add(id);
      }
      const startSeg = segments.find((s) => s.id === bm.startSegmentId);
      const endSeg = segments.find((s) => s.id === bm.endSegmentId);
      if (startSeg && endSeg) {
        ranges.push({ start: startSeg.start, end: endSeg.end });
      }
    }

    // Sort ranges by start time and merge overlapping
    ranges.sort((a, b) => a.start - b.start);
    const merged: TimeRange[] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r.start <= last.end) {
        last.end = Math.max(last.end, r.end);
      } else {
        merged.push({ ...r });
      }
    }

    return {
      activeSegments: segments.filter((s) => activeSegmentIds.has(s.id)),
      activeRanges: merged,
    };
  }, [segments, activeBookmarkIds]);

  const {
    isPlaying,
    isLoading,
    isCueing,
    shuffleActive,
    currentTime,
    duration,
    currentSegmentIndex,
    waitingForUser,
    togglePlay,
    seek,
    skipForward,
    skipBack,
    cue,
    srsRecords,
    handleHard,
    handleGood,
    handleEasy,
  } = useAudioPlayer({
    segments: activeSegments,
    mode,
    selectedCharacter,
    audioUrl: `${import.meta.env.BASE_URL}${AssetPath.AUDIO}`,
    activeRanges,
  });

  const userSegments = useMemo(() => {
    if (mode !== AudioMode.REHEARSE || !selectedCharacter) return undefined;
    return activeSegments.filter((s) => s.speaker === selectedCharacter);
  }, [activeSegments, mode, selectedCharacter]);

  const handleModeChange = (newMode: Mode) => {
    trackModeChanged(newMode);
    setMode(newMode);
    if ((newMode === AudioMode.REHEARSE || newMode === AudioMode.SHUFFLE) && !selectedCharacter) {
      setSelectedCharacter(GameCharacter.TED);
    }
    // Seek to start of first active range, or 0
    const startTime = activeRanges ? activeRanges[0].start : 0;
    seek(startTime);
    if (isPlaying) {
      togglePlay();
    }
  };

  const handleTogglePlay = () => {
    trackPlaybackAction(isPlaying ? 'pause' : 'play');
    togglePlay();
  };

  const handleSkipBack = () => {
    trackPlaybackAction('prev');
    skipBack();
  };

  const handleSkipForward = () => {
    trackPlaybackAction('next');
    skipForward();
  };

  const handleSeek = (time: number) => {
    trackPlaybackAction('seek');
    seek(time);
  };

  return (
    <div className="app">
      {needsOnboarding && (
        <OnboardingModal onComplete={() => setNeedsOnboarding(false)} />
      )}

      <header className="app-header">
        <ModeSelector mode={mode} onChange={handleModeChange} />
        {(mode === AudioMode.REHEARSE || mode === AudioMode.SHUFFLE) && (
          <CharacterSelector selected={selectedCharacter} onChange={setSelectedCharacter} />
        )}
        <div className="header-actions">
          <BookmarkToggle
            hasActive={activeBookmarkIds.size > 0}
            onClick={() => setBookmarkPanelOpen(true)}
          />
          {mode === AudioMode.SHUFFLE && (
            <StatsToggle onClick={() => setStatsPanelOpen(true)} />
          )}
        </div>
      </header>

      {statsPanelOpen && mode === AudioMode.SHUFFLE && (
        <StatsPanel
          segments={segments}
          srsRecords={srsRecords}
          onClose={() => setStatsPanelOpen(false)}
        />
      )}

      {bookmarkPanelOpen && (
        <BookmarkPanel
          bookmarks={BOOKMARKS}
          segments={segments}
          activeIds={activeBookmarkIds}
          onToggle={toggleBookmark}
          onClose={() => setBookmarkPanelOpen(false)}
        />
      )}

      <main className="app-main">
        <LineDisplay
          segments={activeSegments}
          currentSegmentIndex={currentSegmentIndex}
          waitingForUser={waitingForUser}
          isCueing={isCueing}
          isRehearsing={mode === AudioMode.REHEARSE || mode === AudioMode.SHUFFLE}
          isShuffleMode={mode === AudioMode.SHUFFLE}
          selectedCharacter={selectedCharacter}
          onSeek={(time) => {
            if (mode !== AudioMode.SHUFFLE) {
              handleSeek(time);
            }
          }}
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
              onSeek={handleSeek}
              userSegments={userSegments}
              activeRanges={activeRanges}
            />
            <PlayerControls
              mode={mode}
              isPlaying={isPlaying}
              waitingForUser={waitingForUser}
              shuffleActive={shuffleActive}
              onTogglePlay={handleTogglePlay}
              onSkipBack={handleSkipBack}
              onSkipForward={handleSkipForward}
              onHard={handleHard}
              onGood={handleGood}
              onEasy={handleEasy}
            />
          </>
        )}
      </footer>
    </div>
  );
}

export default App;
