import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Leaves a screen that has nothing to show for the Plan: down the stack to the Plan already under
 * it, or, with none there (a link that opened the app on this screen), in this screen's place.
 * A `<Redirect href="/">` replaced the screen with a new Plan, so a sheet opened over the Plan
 * left two Plans stacked, the second in the current month whatever the first was showing.
 */
export function BackToPlan() {
  useEffect(() => {
    router.dismissTo('/');
  }, []);
  return null;
}
