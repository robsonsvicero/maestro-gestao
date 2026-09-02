import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  isAuthenticated: false,
  accessStatus: 'idle',
  accessType: null,
  trialEndsAt: null,
  accessEndsAt: null,
  refreshAccess: async () => 'idle',
  navigateToLogin: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [accessStatus, setAccessStatus] = useState('idle');
  const [accessType, setAccessType] = useState(null);
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [accessEndsAt, setAccessEndsAt] = useState(null);

  const refreshAccess = async (currentSession) => {
    const sessionToCheck = currentSession ?? session;
    if (!sessionToCheck) {
      setAccessStatus('idle');
      setAccessType(null);
      setTrialEndsAt(null);
      setAccessEndsAt(null);
      return 'idle';
    }

    setAccessStatus('checking');
    try {
      const { data, error } = await supabase.functions.invoke('activate-access', {
        headers: {
          Authorization: `Bearer ${sessionToCheck.access_token}`,
        },
      });
      if (error) throw error;
      const status = data?.status ?? 'no_license';
      setAccessStatus(status);
      setAccessType(data?.access_type ?? null);
      setTrialEndsAt(data?.trial_ends_at ?? null);
      setAccessEndsAt(data?.access_ends_at ?? data?.trial_ends_at ?? null);
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
          setAccessStatus('checking');
          setTimeout(() => refreshAccess(nextSession), 0);
        } else {
          setAccessStatus('idle');
          setAccessType(null);
          setTrialEndsAt(null);
          setAccessEndsAt(null);
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
      accessType,
      trialEndsAt,
      accessEndsAt,
      refreshAccess,
      navigateToLogin: () => {
        window.location.href = '/login';
      },
    }),
    [accessStatus, accessEndsAt, accessType, authError, isLoadingAuth, session, trialEndsAt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
