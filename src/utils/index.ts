export const explicitRoutes: Record<string, string> = {
  Landing: '/landing',
  Home: '/home',
  Descubrir: '/descubrir',
  CrearQuedada: '/crearquedada',
  MisMatches: '/mismatches',
  Profile: '/profile',
  Admin: '/admin',
  SettingsPage: '/settings',
  NotificationsSettings: '/settings/notifications',
  LanguageSettings: '/settings/language',
  PrivacySettings: '/settings/privacy',
  AccountSettings: '/settings/account',
};

export function createPageUrl(pageName: string) {
  return explicitRoutes[pageName] || `/${pageName.replace(/\s+/g, '').toLowerCase()}`;
}

