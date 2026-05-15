import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AuthContext = createContext();
function getFallbackProfile(user) {
  return {
    id: user?.id,
    email: user?.email || '',
    username:
      String(user?.user_metadata?.username || user?.user_metadata?.full_name || '').trim() ||
      'User',
    avatar_url: user?.user_metadata?.avatar_url || '',
    role: 'user',
    account_status: 'active',
  };
}

function normalizeResolvedProfile(profile, fallbackUser = null) {
  const fallback = fallbackUser ? getFallbackProfile(fallbackUser) : null;

  return {
    ...(fallback || {}),
    ...(profile || {}),
    username: String(profile?.username || fallback?.username || '').trim() || 'User',
  };
}

function friendlyAuthError(error) {
  const raw = String(error?.message || error || '');
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Your email is not confirmed yet. Check your inbox or request a new link.';
  if (lower.includes('signup is disabled')) return 'El registro esta desactivado en este momento.';
  if (lower.includes('user already registered') || lower.includes('already registered')) return 'An account already exists with that email. Sign in instead.';
  if (lower.includes('rate limit')) return 'Demasiados intentos. Espera un minuto y prueba de nuevo.';
  if (lower.includes('network') || lower.includes('failed to fetch')) return 'Could not connect to the auth service. Check the private configuration.';
  if (lower.includes('duplicate key') || lower.includes('unique')) return 'That public username is already taken. Try another one.';
  return raw || 'Authentication could not be completed.';
}

function cleanUsername(value, fallback = 'User') {
  const base = String(value || fallback || 'User')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 24);
  return base.length >= 2 ? base : `usuario_${Math.floor(1000 + Math.random() * 9000)}`;
}

async function getAvailableUsername(preferred) {
  const base = cleanUsername(preferred, 'User');
  if (!supabase) return base;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', base)
      .limit(1);
    if (error || !data?.length) return base;
    return `${base.slice(0, 20)}_${Math.floor(1000 + Math.random() * 9000)}`;
  } catch {
    return base;
  }
}


function mapSessionUser(sessionUser, resolvedProfile = null) {
  if (!sessionUser) return null;
  const safeProfile = normalizeResolvedProfile(resolvedProfile, sessionUser);
  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    full_name: safeProfile.username,
    username: safeProfile.username,
    role: safeProfile.role || 'user',
    account_status: safeProfile.account_status || 'active',
    avatar_url: safeProfile.avatar_url || '',
  };
}

async function fetchProfileByUserId(userId, fallbackUser = null) {
  if (!supabase || !userId) {
    return fallbackUser ? getFallbackProfile(fallbackUser) : null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,username,avatar_url,role,account_status,suspended_until')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Profile select failed:', error.message || error);
    return fallbackUser ? getFallbackProfile(fallbackUser) : null;
  }

  if (!data) {
    return fallbackUser ? getFallbackProfile(fallbackUser) : null;
  }

  return normalizeResolvedProfile(data, fallbackUser);
}

async function ensureProfileForUser(sessionUser, cleanName = '') {
  if (!supabase || !sessionUser?.id) return getFallbackProfile(sessionUser);
  const fallback = getFallbackProfile(sessionUser);
  const username = cleanUsername(cleanName || fallback.username, 'User');

  const existing = await fetchProfileByUserId(sessionUser.id, sessionUser);
  if (existing?.id && existing.username) return existing;

  try {
    const payload = {
      id: sessionUser.id,
      email: sessionUser.email || '',
      username,
      avatar_url: sessionUser.user_metadata?.avatar_url || '',
      role: 'user',
      account_status: 'active',
    };
    const payloadWithTimestamp = { ...payload, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payloadWithTimestamp, { onConflict: 'id' })
      .select('id,email,username,avatar_url,role,account_status,suspended_until')
      .maybeSingle();
    if (error?.message?.toLowerCase?.().includes('updated_at')) {
      const retry = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('id,email,username,avatar_url,role,account_status,suspended_until')
        .maybeSingle();
      if (retry.error) throw retry.error;
      return normalizeResolvedProfile(retry.data || payload, sessionUser);
    }
    if (error) throw error;
    return normalizeResolvedProfile(data || payload, sessionUser);
  } catch (error) {
    console.warn('Profile ensure warning:', error?.message || error);
    return normalizeResolvedProfile({ ...fallback, username }, sessionUser);
  }
}

export const AuthProvider = ({ children }) => {
  const [sessionUser, setSessionUser] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProfileReady, setIsProfileReady] = useState(false);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ localMode: false });

  const mountedRef = useRef(true);
  const profileRequestRef = useRef(null);

  const clearSession = useCallback(() => {
    if (!mountedRef.current) return;

    setSessionUser(null);
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setIsProfileReady(true);
  }, []);

  const applyResolvedUser = useCallback(
    (nextSessionUser, resolvedProfile) => {
      if (!mountedRef.current) return;

      if (!nextSessionUser) {
        clearSession();
        return;
      }

      const safeProfile = resolvedProfile || getFallbackProfile(nextSessionUser);

      setSessionUser(nextSessionUser);
      setProfile(safeProfile);
      setUser(mapSessionUser(nextSessionUser, safeProfile));
      setIsAuthenticated(true);
      setIsProfileReady(true);
    },
    [clearSession],
  );

  const resolveProfile = useCallback(
    async (nextSessionUser) => {
      if (!nextSessionUser?.id) return null;
      if (profileRequestRef.current === nextSessionUser.id) return null;

      profileRequestRef.current = nextSessionUser.id;
      if (mountedRef.current) setIsProfileReady(false);

      try {
        const resolved = await fetchProfileByUserId(nextSessionUser.id, nextSessionUser);
        if (!mountedRef.current) return resolved;
        applyResolvedUser(nextSessionUser, resolved);
        return resolved;
      } finally {
        profileRequestRef.current = null;
      }
    },
    [applyResolvedUser],
  );

  const refreshProfile = useCallback(async () => {
    if (!sessionUser?.id) return null;
    return await resolveProfile(sessionUser);
  }, [sessionUser, resolveProfile]);

  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured) {
      setAuthError({
        type: 'config_missing',
        message: 'Supabase no esta configurado.',
      });
      setIsProfileReady(true);
      setIsLoadingAuth(false);
      return () => {
        mountedRef.current = false;
      };
    }

    let unsubscribe = null;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const nextSessionUser = data?.session?.user || null;

        if (!nextSessionUser) {
          clearSession();
          return;
        }

        setSessionUser(nextSessionUser);
        setUser(mapSessionUser(nextSessionUser, getFallbackProfile(nextSessionUser)));
        setIsAuthenticated(true);

        await resolveProfile(nextSessionUser);
      } catch (error) {
        console.error('Session restore error:', error);
        clearSession();
        setAuthError({ type: 'session_error', message: friendlyAuthError(error) || 'Could not restore the session.' });
      } finally {
        if (mountedRef.current) {
          setIsLoadingAuth(false);
        }
      }
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextSessionUser = session?.user || null;

      if (!nextSessionUser) {
        clearSession();
        setIsLoadingAuth(false);
        return;
      }

      setSessionUser(nextSessionUser);
      setUser(mapSessionUser(nextSessionUser, getFallbackProfile(nextSessionUser)));
      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      void resolveProfile(nextSessionUser);
    });

    unsubscribe = listener?.subscription?.unsubscribe;

    return () => {
      mountedRef.current = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [clearSession, resolveProfile]);

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase no esta configurado.');

    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(friendlyAuthError(error));

    const nextSessionUser = data?.user || data?.session?.user || null;

    if (nextSessionUser) {
      const resolved = await ensureProfileForUser(nextSessionUser);
      applyResolvedUser(nextSessionUser, resolved);
    }

    setIsLoadingAuth(false);
    return data;
  };

  const signUp = async ({ email, password, fullName }) => {
    if (!supabase) throw new Error('Supabase no esta configurado.');

    const cleanName = await getAvailableUsername(fullName);
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth/confirm`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: cleanName, username: cleanName },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) throw new Error(friendlyAuthError(error));

    const nextSessionUser = data?.session?.user || data?.user || null;
    if (nextSessionUser) {
      const resolved = await ensureProfileForUser(nextSessionUser, cleanName);
      if (data?.session) applyResolvedUser(nextSessionUser, resolved);
    }

    return data;
  };

  const signInWithProvider = async (provider) => {
    if (!supabase) throw new Error('Supabase no esta configurado.');
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth/confirm`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw new Error(friendlyAuthError(error));
    return data;
  };

  const resetPassword = async (email) => {
    if (!supabase) throw new Error('Supabase no esta configurado.');
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail) throw new Error('Escribe tu email primero.');
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    if (error) throw new Error(friendlyAuthError(error));
    return true;
  };

  const logout = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (error) {
      console.warn('Logout warning:', error?.message || error);
    } finally {
      clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/home';
      }
    }
  };

  const deleteAccount = async () => {
    if (!supabase) throw new Error('Supabase no esta configurado.');
    const { error } = await supabase.rpc('request_account_deletion');
    if (error) throw new Error(error.message || 'Could not request account deletion.');
    await logout();
    return true;
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  };

  const checkAppState = async () => {
    if (!supabase) {
      clearSession();
      return;
    }

    const { data } = await supabase.auth.getSession();
    const nextSessionUser = data?.session?.user || null;

    if (!nextSessionUser) {
      clearSession();
      return;
    }

    setSessionUser(nextSessionUser);
    setUser(mapSessionUser(nextSessionUser, getFallbackProfile(nextSessionUser)));
    setIsAuthenticated(true);
    await resolveProfile(nextSessionUser);
  };

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role || user?.role || 'user',
      accountStatus: profile?.account_status || user?.account_status || 'active',
      isAdmin: (profile?.role || user?.role) === 'admin' && ['active', 'warned'].includes(profile?.account_status || user?.account_status || 'active'),
      refreshProfile,
      isAuthenticated,
      isLoadingAuth,
      isProfileReady,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      deleteAccount,
      navigateToLogin,
      checkAppState,
      signIn,
      signUp,
      signInWithProvider,
      resetPassword,
      isSupabaseConfigured,
    }),
    [
      user,
      profile,
      refreshProfile,
      isAuthenticated,
      isLoadingAuth,
      isProfileReady,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

