import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseClient, hasSupabaseConfig } from '../../lib/supabase/client';

interface AuthContextValue {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Landing and local demo should work from a fresh clone with no .env.local.
    // Cloud-backed routes display setup guidance until valid settings are provided.
    if (!hasSupabaseConfig()) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let client: ReturnType<typeof getSupabaseClient>;

    try {
      client = getSupabaseClient();
    } catch (error) {
      console.error('MedViz Supabase initialization failed:', error);
      setIsLoading(false);
      return;
    }

    const bootstrap = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.error('MedViz session restore failed:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('MedViz session restore failed:', error);
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      session,
      user,
    }),
    [isLoading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
