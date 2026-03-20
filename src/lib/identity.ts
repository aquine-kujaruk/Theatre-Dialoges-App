import { setUserProperties } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';

const ACTOR_NAME_KEY = 'actor_name';
const DEVICE_ID_KEY = 'device_id';

function generateUUID(): string {
  return crypto.randomUUID();
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getActorName(): string | null {
  return localStorage.getItem(ACTOR_NAME_KEY);
}

export function setActorName(name: string): void {
  localStorage.setItem(ACTOR_NAME_KEY, name);
  syncUserProperties();
}

export function syncUserProperties(): void {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;
  const actorName = getActorName();
  const deviceId = getDeviceId();
  setUserProperties(analytics, {
    actor_name: actorName ?? '',
    device_id: deviceId,
  });
}
