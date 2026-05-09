import React, { Suspense, lazy } from 'react';
import { Toaster } from 'sonner';
import FloatingSupportButton from '@/components/shared/FloatingSupportButton';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { createPageUrl } from '@/utils';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
const AuthPage = lazy(() => import('./pages/Auth'));
const AuthConfirm = lazy(() => import('./pages/AuthConfirm'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => null;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

function LoadingScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#080808]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-700 border-t-red-500" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) return <LoadingScreen />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  return children;
}

const PUBLIC_PAGES = new Set(['Landing', 'Home', 'Descubrir', 'Rankings', 'ActivityFeed']);

function AdminRoute({ children }) {
  const { role, isLoadingAuth, isProfileReady, isAuthenticated } = useAuth();
  if (isLoadingAuth || (isAuthenticated && !isProfileReady)) return <LoadingScreen />;
  if (role !== 'admin') return <Navigate to="/home" replace />;
  return children;
}

function ProtectedPage({ pageName, Component }) {
  return (
    <ProtectedRoute>
      <LayoutWrapper currentPageName={pageName}>
        <Component />
      </LayoutWrapper>
    </ProtectedRoute>
  );
}

const lowerAlias = (path) => createPageUrl(path);
const kebabAlias = (path) => '/' + path.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();

const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/auth/confirm" element={<AuthConfirm />} />
    <Route path="/profile/:userId" element={<PublicProfile />} />
    <Route path="/u/:userId" element={<PublicProfile />} />
    <Route path="/" element={<Navigate to={lowerAlias(mainPageKey)} replace />} />
    <Route path={lowerAlias(mainPageKey)} element={PUBLIC_PAGES.has(mainPageKey) ? (<LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>) : (<ProtectedPage pageName={mainPageKey} Component={MainPage} />)} />
    <Route path={`/${mainPageKey}`} element={<Navigate to={lowerAlias(mainPageKey)} replace />} />
    {Object.entries(Pages).map(([path, Page]) => (
      <React.Fragment key={path}>
        <Route
          path={lowerAlias(path)}
          element={PUBLIC_PAGES.has(path) ? (
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          ) : (
            <ProtectedPage pageName={path} Component={Page} />
          )}
        />
        <Route path={kebabAlias(path)} element={<Navigate to={lowerAlias(path)} replace />} />
        <Route path={`/${path}`} element={<Navigate to={lowerAlias(path)} replace />} />
        <Route path={`/${path.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`} element={<Navigate to={lowerAlias(path)} replace />} />
      </React.Fragment>
    ))}
    <Route path="/admin" element={<ProtectedRoute><AdminRoute><LayoutWrapper currentPageName="Admin"><Admin /></LayoutWrapper></AdminRoute></ProtectedRoute>} />
    <Route path="/Admin" element={<Navigate to="/admin" replace />} />
    <Route path="/mis-matches" element={<Navigate to="/mismatches" replace />} />
    <Route path="/crear-quedada" element={<Navigate to="/crearquedada" replace />} />
    <Route path="*" element={<PageNotFound />} />
  </Routes>
  </Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
          <FloatingSupportButton />
        </Router>
        <Toaster richColors position="top-center" closeButton />
      </QueryClientProvider>
    </AuthProvider>
  );
}

