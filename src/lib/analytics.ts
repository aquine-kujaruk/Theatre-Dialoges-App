import { logEvent } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';

function track(eventName: string, params?: Record<string, string | number>) {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

export function trackSectionEnter(sectionName: string) {
  track('section_enter', { section_name: sectionName });
}

export function trackSectionExit(sectionName: string, timeSpentSeconds: number) {
  track('section_exit', {
    section_name: sectionName,
    time_spent_seconds: Math.round(timeSpentSeconds),
  });
}

export function trackModeChanged(mode: string) {
  track('mode_changed', { mode });
}

export function trackPlaybackAction(action: 'play' | 'pause' | 'next' | 'prev' | 'seek') {
  track('playback_action', { action });
}

export function trackBookmarkInteraction(action: 'filter' | 'select', bookmarkId: number) {
  track('bookmark_interaction', { action, bookmark_id: bookmarkId });
}

export function trackSessionEnd(totalSessionSeconds: number) {
  track('session_end', {
    total_session_seconds: Math.round(totalSessionSeconds),
  });
}
