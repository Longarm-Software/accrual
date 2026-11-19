import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `onReturn` when the app becomes `active` again after having been in `background`.
 * Only a stay in `background` counts: iOS also passes through `inactive` for a moment on the
 * way out and back, and stays `inactive` alone for the app switcher, Notification Centre or
 * an incoming call, which are not leaving the app. Android has no `inactive`.
 */
export function useReturnToForeground(onReturn: () => void): void {
  // The latest callback, so the subscription is made once.
  const latest = useRef(onReturn);
  useEffect(() => {
    latest.current = onReturn;
  });
  useEffect(() => {
    let away = false;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        away = true;
      } else if (state === 'active' && away) {
        away = false;
        latest.current();
      }
    });
    return () => subscription.remove();
  }, []);
}
