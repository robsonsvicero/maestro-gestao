import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  isAuthenticated: false,
  navigateToLogin: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error && error.status !== 401 && error.name !== 'AuthSessionMissingError') {
          setAuthError({ type: 'auth_required', message: error.message });
        }

        setSession(currentSession ?? null);
      } catch (error) {
        if (isMounted) {
          setAuthError({ type: 'auth_required', message: error.message || 'Sessão inválida' });
        }
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession ?? null);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      isAuthenticated: Boolean(session),
      navigateToLogin: () => {
        window.location.href = '/login';
      },
    }),
    [authError, isLoadingAuth, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
