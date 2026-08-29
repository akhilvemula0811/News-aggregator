import { Story } from '../types/api';

let watchHistory: Story[] = [];
const listeners = new Set<() => void>();

export function getWatchHistory(): Story[] {
  // Return a copy to ensure immutability
  return [...watchHistory];
}

export function addToWatchHistory(story: Story) {
  // Avoid duplicating existing stories; move them to the top of the history list if read again
  if (watchHistory.some(s => s.id === story.id)) {
    watchHistory = [story, ...watchHistory.filter(s => s.id !== story.id)];
  } else {
    watchHistory = [story, ...watchHistory];
  }
  listeners.forEach(l => l());
}

export function subscribeWatchHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
