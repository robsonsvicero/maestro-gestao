import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const validAccessTypes = new Set(['trial', 'subscription', 'lifetime']);

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  isAuthenticated: false,
  isAdmin: false,
  accessStatus: 'idle',
  accessType: null,
  accessProvider: null,
  accessReason: null,
  trialEndsAt: null,
  accessEndsAt: null,
  refreshAccess: async () => 'idle',
  navigateToLogin: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessStatus, setAccessStatus] = useState('idle');
  const [accessType, setAccessType] = useState(null);
  const [accessProvider, setAccessProvider] = useState(null);
  const [accessReason, setAccessReason] = useState(null);
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [accessEndsAt, setAccessEndsAt] = useState(null);
  const sessionUserId = useRef(null);

  const refreshAccess = async (currentSession) => {
    const sessionToCheck = currentSession ?? session;
    if (!sessionToCheck) {
      setAccessStatus('idle');
      setIsAdmin(false);
      setAccessType(null);
      setAccessProvider(null);
      setAccessReason(null);
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
      setIsAdmin(Boolean(data?.is_admin));
      setAccessType(validAccessTypes.has(data?.access_type) ? data.access_type : null);
      setAccessProvider(data?.provider ?? null);
      setAccessReason(data?.access_reason ?? null);
      setTrialEndsAt(data?.trial_ends_at ?? null);
      setAccessEndsAt(data?.access_ends_at ?? data?.trial_ends_at ?? null);
      return status;
    } catch (error) {
      console.error('Erro ao verificar licença:', error);
      setAccessStatus('verification_error');
      setAccessReason('verification_error');
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

        sessionUserId.current = currentSession?.user?.id ?? null;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (isMounted) {
        const nextUserId = nextSession?.user?.id ?? null;
        const userChanged = sessionUserId.current !== nextUserId;
        sessionUserId.current = nextUserId;

        if (!nextSession) {
          setSession(null);
          setAccessStatus('idle');
          setIsAdmin(false);
          setAccessType(null);
          setAccessProvider(null);
          setAccessReason(null);
          setTrialEndsAt(null);
          setAccessEndsAt(null);
          setIsLoadingAuth(false);
          return;
        }

        setSession((currentSession) => currentSession ?? nextSession);
        setIsLoadingAuth(false);

        // Token renewal and tab visibility changes must not blank the app.
        if (userChanged && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          setAccessStatus('checking');
          setTimeout(() => refreshAccess(nextSession), 0);
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
      isAdmin,
      accessStatus,
      accessType,
      accessProvider,
      accessReason,
      trialEndsAt,
      accessEndsAt,
      refreshAccess,
      navigateToLogin: () => {
        window.location.href = '/login';
      },
    }),
    [accessProvider, accessReason, accessStatus, accessEndsAt, accessType, authError, isAdmin, isLoadingAuth, session, trialEndsAt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
