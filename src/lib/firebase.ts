import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

let analyticsInstance: Analytics | null = null;

export async function initAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  const supported = await isSupported();
  if (supported) {
    analyticsInstance = getAnalytics(app);
    if (import.meta.env.DEV) {
      console.log('[Analytics] Firebase Analytics initialized', { measurementId: firebaseConfig.measurementId });
    }
  } else if (import.meta.env.DEV) {
    console.warn('[Analytics] Firebase Analytics not supported in this environment');
  }
  return analyticsInstance;
}

export function getAnalyticsInstance(): Analytics | null {
  return analyticsInstance;
}
