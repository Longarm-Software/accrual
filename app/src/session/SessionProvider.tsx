// Owns the engine and the saved session, and says which screen should show.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { EngineError } from '../engine/types';
import type { Auth, Engine, OpenStage, RemoteBudget } from '../engine/types';
import { clearSession, loadSession, saveSession } from './storage';
import type { SavedSession } from './storage';

export type SessionStatus = 'loading' | 'signedOut' | 'needsBudget' | 'closed' | 'open';
export type CreateEngine = (config: { serverURL: string } & Auth) => Promise<Engine>;
export type Session = {
  status: SessionStatus;
  saved: SavedSession | null;
  engine: Engine | null;
  connect(serverURL: string, password: string): Promise<RemoteBudget[]>;
  chooseBudget(budget: RemoteBudget): Promise<void>;
  open(onStage?: (stage: OpenStage) => void | Promise<void>): Promise<void>;
  signOut(): Promise<void>;
};

const Context = createContext<Session | null>(null);

// Required lazily so tests, which pass their own `create`, never load the engine bundle.
const realCreate: CreateEngine = config => require('../engine/adapter').createEngine(config);

export function SessionProvider({ children, create = realCreate }: { children: ReactNode; create?: CreateEngine }) {
  const [saved, setSaved] = useState<SavedSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const engine = useRef<Engine | null>(null);

  useEffect(() => {
    void loadSession().then(session => {
      setSaved(session);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: SavedSession | null) => {
    await (next ? saveSession(next) : clearSession());
    setSaved(next);
  }, []);

  const signOut = useCallback(async () => {
    await engine.current?.close().catch(() => {});
    engine.current = null;
    setIsOpen(false);
    await persist(null);
  }, [persist]);

  const connect = useCallback(
    async (serverURL: string, password: string) => {
      const next = await create({ serverURL, password });
      engine.current = next;
      const [sessionToken, budgets] = await Promise.all([next.sessionToken(), next.listBudgets()]);
      await persist({ serverURL, sessionToken, budget: null });
      return budgets;
    },
    [create, persist],
  );

  const chooseBudget = useCallback(
    async (budget: RemoteBudget) => {
      if (!saved) throw new EngineError('token-expired', 'Not signed in');
      setIsOpen(false);
      await persist({ ...saved, budget });
    },
    [saved, persist],
  );

  const open = useCallback(
    async (onStage?: (stage: OpenStage) => void | Promise<void>) => {
      if (!saved?.budget) throw new EngineError('internal', 'No budget chosen');
      try {
        engine.current ??= await create({ serverURL: saved.serverURL, sessionToken: saved.sessionToken });
        await engine.current.openBudget(saved.budget, onStage);
        setIsOpen(true);
      } catch (e) {
        if (e instanceof EngineError && e.code === 'token-expired') await signOut();
        throw e;
      }
    },
    [saved, create, signOut],
  );

  const status: SessionStatus = !loaded ? 'loading' : !saved ? 'signedOut' : !saved.budget ? 'needsBudget' : isOpen ? 'open' : 'closed';
  const value = useMemo(
    () => ({ status, saved, engine: engine.current, connect, chooseBudget, open, signOut }),
    [status, saved, connect, chooseBudget, open, signOut],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): Session {
  const session = useContext(Context);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
}
