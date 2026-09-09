import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const AppLoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-900 md:p-6">
    <div className="mx-auto flex max-w-7xl gap-6">
      <aside className="hidden w-64 shrink-0 space-y-6 md:block">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-11 w-full rounded-xl" />)}
        </div>
      </aside>
      <main className="min-w-0 flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </main>
    </div>
  </div>
);

const AppAccessLoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
    <img
      src="/logo_maeztro.webp"
      alt="MAEZTRO Gestão"
      className="h-32 w-32 animate-pulse object-contain"
    />
  </div>
);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, accessStatus, navigateToLogin, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AppLoadingScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (location.pathname !== '/login') {
        navigateToLogin();
        return null;
      }
    }
  }

  const publicPaths = ['/login', '/teste-gratis', '/definir-senha', '/primeiro-acesso'];
  if (!isAuthenticated && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && (accessStatus === 'idle' || accessStatus === 'checking')) {
    return <AppAccessLoadingScreen />;
  }

  if (isAuthenticated && accessStatus !== 'active' && !['/ativar-acesso', '/teste-gratis', '/definir-senha', '/primeiro-acesso'].includes(location.pathname)) {
    return <Navigate to="/ativar-acesso" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Pages.Login />} />
      <Route path="/teste-gratis" element={<Pages.FreeTrial />} />
      <Route path="/definir-senha" element={<Pages.SetPassword />} />
      <Route path="/primeiro-acesso" element={<Pages.FirstAccess />} />
      <Route path="/ativar-acesso" element={<Pages.ActivateAccess />} />
      <Route path="/" element={
        isAdmin ? <Navigate to="/admin-licenses" replace /> :
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={createPageUrl(path)}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
