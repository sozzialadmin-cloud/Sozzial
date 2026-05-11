export const APP_SETTINGS_KEY = 'sozzial_app_settings';

export const defaultAppSettings = {
  notifications: { pushEnabled: false, messageAlerts: true, groupAlerts: true, followAlerts: true },
  language: 'English',
  privacy: { showProfile: true, showJoinedPlans: true, allowMessagesFromMembers: true },
  account: { rememberMe: true },
};

export function readAppSettings() {
  if (typeof window === 'undefined') return defaultAppSettings;
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || 'null');
    if (!parsed) return defaultAppSettings;
    return {
      ...defaultAppSettings,
      ...parsed,
      notifications: { ...defaultAppSettings.notifications, ...(parsed.notifications || {}) },
      privacy: { ...defaultAppSettings.privacy, ...(parsed.privacy || {}) },
      account: { ...defaultAppSettings.account, ...(parsed.account || {}) },
    };
  } catch {
    return defaultAppSettings;
  }
}

export function writeAppSettings(next) {
  if (typeof window !== 'undefined') localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
  return next;
}
