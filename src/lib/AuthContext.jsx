import { createContext, useContext, useMemo } from 'react';

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  isAuthenticated: true,
  navigateToLogin: () => {},
});

export function AuthProvider({ children }) {
  const value = useMemo(
    () => ({
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      isAuthenticated: true,
      navigateToLogin: () => {},
    }),
    []
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
