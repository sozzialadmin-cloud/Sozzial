import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
const Descubrir = lazy(() => import('./pages/Descubrir'));
const CrearQuedada = lazy(() => import('./pages/CrearQuedada'));
const MisMatches = lazy(() => import('./pages/MisMatches'));
const Passport = lazy(() => import('./pages/Passport'));
const Rankings = lazy(() => import('./pages/Rankings'));
const ActivityFeed = lazy(() => import('./pages/ActivityFeed'));
const Profile = lazy(() => import('./pages/Profile'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsSettings = lazy(() => import('./pages/NotificationsSettings'));
const LanguageSettings = lazy(() => import('./pages/LanguageSettings'));
const PrivacySettings = lazy(() => import('./pages/PrivacySettings'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));

export const PAGES = {
  Landing,
  Home,
  Descubrir,
  CrearQuedada,
  MisMatches,
  Passport,
  Rankings,
  ActivityFeed,
  Profile,
  SettingsPage,
  NotificationsSettings,
  LanguageSettings,
  PrivacySettings,
  AccountSettings,
};

export const pagesConfig = {
  mainPage: 'Landing',
  Pages: PAGES,
  Layout: __Layout,
};

