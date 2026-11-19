import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { EngineError } from '../engine/types';
import type { OpenStage } from '../engine/types';
import { connectErrorMessage } from '../features/connect/errors';
import { stageCopy } from '../features/opening/stageCopy';
import { useSession } from '../session/SessionProvider';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Body, Title } from '../ui/Text';

// Two frames: one for React to commit the new text, one for it to reach the screen. The
// next step may block the JavaScript thread, and text that has not been painted would
// otherwise never appear.
const painted = () =>
  new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export default function Opening() {
  const theme = useTheme();
  const session = useSession();
  const [stage, setStage] = useState<OpenStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Refs, not state: set synchronously, and kept across re-renders and React's development
  // double run of effects. The engine allows one sign-in session per process, so two opens
  // at once (a second start, or "Try again" tapped twice) must never happen.
  const started = useRef(false);
  const inFlight = useRef(false);
  // Navigate away once: an expired token both fails the open and signs out, and each would.
  const left = useRef(false);
  const leave = useCallback((to: '/' | '/connect') => {
    if (left.current) return;
    left.current = true;
    router.replace(to);
  }, []);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setStage(null);
    try {
      // The engine does not always await this (syncing on a first open comes from an event),
      // so it only shows the step; nothing depends on it finishing.
      await session.open(async next => {
        setStage(next);
        await painted();
      });
      leave('/');
    } catch (e) {
      const code = e instanceof EngineError ? e.code : 'internal';
      if (code === 'token-expired') return leave('/connect');
      setError(connectErrorMessage(code));
    } finally {
      inFlight.current = false;
    }
  }, [session, leave]);

  // Start once, as soon as the saved session has loaded.
  useEffect(() => {
    if (session.status === 'closed' && !started.current) {
      started.current = true;
      void run();
    }
    // An expired token signs out during the open; `run` sends that case to Connect itself.
    if (!inFlight.current && (session.status === 'signedOut' || session.status === 'needsBudget')) leave('/connect');
  }, [session.status, run, leave]);

  const copy = stageCopy(stage, session.saved?.budget?.name ?? 'your budget');
  return (
    <AuroraBackground>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }}>
        {error ? (
          <>
            <Body color={theme.color.over} style={{ textAlign: 'center' }}>{error}</Body>
            <View style={{ alignSelf: 'stretch' }}><Button title="Try again" onPress={() => void run()} /></View>
          </>
        ) : (
          <>
            <Spinner />
            <Title style={{ textAlign: 'center', fontSize: 28 }}>{copy.title}</Title>
            <Body color={theme.color.mute} style={{ textAlign: 'center' }}>{copy.detail}</Body>
          </>
        )}
      </View>
    </AuroraBackground>
  );
}
