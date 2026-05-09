import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { pagesConfig } from '@/pages.config';
import { createPageUrl } from '@/utils';
import PageNotFound from '@/lib/PageNotFound';
import { useAuth } from '@/lib/AuthContext';
import LoadingScreen from '@/app/LoadingScreen';
import { PUBLIC_PAGE_NAMES } from '@/app/navigation';

const AuthPage = lazy(() => import('@/pages/Auth'));
const AuthConfirm = lazy(() => import('@/pages/AuthConfirm'));
const Admin = lazy(() => import('@/pages/Admin'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => null;

function LayoutWrapper({ children, currentPageName }) {
  return Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;
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

function PublicOrProtectedPage({ pageName, Component }) {
  if (PUBLIC_PAGE_NAMES.has(pageName)) {
    return (
      <LayoutWrapper currentPageName={pageName}>
        <Component />
      </LayoutWrapper>
    );
  }
  return <ProtectedPage pageName={pageName} Component={Component} />;
}

const lowerAlias = (path) => createPageUrl(path);
const kebabAlias = (path) => '/' + path.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/u/:userId" element={<PublicProfile />} />
        <Route path="/" element={<Navigate to={lowerAlias(mainPageKey)} replace />} />
        <Route path={lowerAlias(mainPageKey)} element={<PublicOrProtectedPage pageName={mainPageKey} Component={MainPage} />} />
        <Route path={`/${mainPageKey}`} element={<Navigate to={lowerAlias(mainPageKey)} replace />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <React.Fragment key={path}>
            <Route path={lowerAlias(path)} element={<PublicOrProtectedPage pageName={path} Component={Page} />} />
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
}
