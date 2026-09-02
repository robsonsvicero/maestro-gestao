import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  isAuthenticated: false,
  accessStatus: 'idle',
  refreshAccess: async () => 'idle',
  navigateToLogin: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [accessStatus, setAccessStatus] = useState('idle');

  const refreshAccess = async (currentSession) => {
    const sessionToCheck = currentSession ?? session;
    if (!sessionToCheck) {
      setAccessStatus('idle');
      return 'idle';
    }

    try {
      const { data, error } = await supabase.functions.invoke('activate-access', {
        headers: {
          Authorization: `Bearer ${sessionToCheck.access_token}`,
        },
      });
      if (error) throw error;
      const status = data?.status ?? 'no_license';
      setAccessStatus(status);
      return status;
    } catch (error) {
      console.error('Erro ao verificar licença:', error);
      setAccessStatus('verification_error');
      return 'verification_error';
    }
  };

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
        if (currentSession) await refreshAccess(currentSession);
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
        if (nextSession) {
          setTimeout(() => refreshAccess(nextSession), 0);
        } else {
          setAccessStatus('idle');
        }
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
      accessStatus,
      refreshAccess,
      navigateToLogin: () => {
        window.location.href = '/login';
      },
    }),
    [accessStatus, authError, isLoadingAuth, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
