'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
  avatarUrl?: string;
  createdAt?: string;
  preferences: {
    locale?: string;
    theme?: string;
    notifications?: { email: boolean; push: boolean };
  };
}

interface AuthContext {
  user: User | null;
  loading: boolean;
  locale: string;
  theme: string;
  login: (token: string, user: User) => void;
  logout: () => void;
  updatePreferences: (prefs: Partial<User['preferences']>) => void;
  refreshUser: () => Promise<void>;
  patchUser: (fields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContext>({
  user: null,
  loading: true,
  locale: 'en',
  theme: 'light',
  login: () => {},
  logout: () => {},
  updatePreferences: () => {},
  refreshUser: async () => {},
  patchUser: () => {},
});

// ── Guest preferences via localStorage ───────────────────────
const GUEST_PREFS_KEY = 'progenesis_guest_prefs';

function getGuestPreferences(): { locale: string; theme: string } {
  if (typeof window === 'undefined') return { locale: 'en', theme: 'light' };
  try {
    const stored = localStorage.getItem(GUEST_PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { locale: 'en', theme: 'light' };
}

function setGuestPreferences(prefs: { locale?: string; theme?: string }) {
  if (typeof window === 'undefined') return;
  const current = getGuestPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(updated));
}

// ── Theme application ─────────────────────────────────────────
function applyTheme(theme: string) {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function resolvePreferences(u: User | null): { locale: string; theme: string } {
  if (u) {
    return {
      locale: u.preferences?.locale || 'en',
      theme: u.preferences?.theme || 'light',
    };
  }
  return getGuestPreferences();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState('en');
  const [theme, setTheme] = useState('light');

  function applyAndSet(prefs: { locale: string; theme: string }) {
    setLocale(prefs.locale);
    setTheme(prefs.theme);
    applyTheme(prefs.theme);
  }

  // ── On mount — load user or guest prefs ──────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      // No token — apply guest preferences from localStorage
      const guestPrefs = getGuestPreferences();
      applyAndSet(guestPrefs);
      setLoading(false);
      return;
    }

    api
      .get<User>('/auth/me')
      .then((u) => {
        setUser(u);
        applyAndSet(resolvePreferences(u));
      })
      .catch(() => {
        localStorage.removeItem('token');
        // Fall back to guest prefs
        applyAndSet(getGuestPreferences());
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login — apply user prefs, discard guest prefs ────────────
  function login(token: string, u: User) {
    localStorage.setItem('token', token);
    setUser(u);
    applyAndSet(resolvePreferences(u));
  }

  // ── Logout — carry current prefs into guest state ────────────
  function logout() {
    api.post('/auth/logout', {}).catch(() => {});
    localStorage.removeItem('token');
    setGuestPreferences({ locale, theme });
    setUser(null);
    applyAndSet({ locale, theme });
  }

  // ── Patch user state locally ──────────────────────────────────
  const patchUser = useCallback((fields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  // ── Refresh user from server ──────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const u = await api.get<User>('/auth/me');
      setUser(u);
      applyAndSet(resolvePreferences(u));
    } catch {}
  }, []);

  // ── Update preferences ────────────────────────────────────────
  const updatePreferences = useCallback(
    async (prefs: Partial<User['preferences']>) => {
      if (user) {
        // Logged in — save to DB
        try {
          await api.patch(`/users/${user.id}/preferences`, {
            ...user.preferences,
            ...prefs,
          });
          const updated = {
            ...user,
            preferences: { ...user.preferences, ...prefs },
          };
          setUser(updated);
          applyAndSet(resolvePreferences(updated));
        } catch (e) {
          console.error('Failed to update preferences', e);
        }
      } else {
        // Guest — save to localStorage
        setGuestPreferences(prefs);
        const updated = { ...getGuestPreferences(), ...prefs };
        applyAndSet({
          locale: updated.locale ?? locale,
          theme: updated.theme ?? theme,
        });
      }
    },
    [user, locale, theme]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, locale, theme, login, logout, updatePreferences, refreshUser, patchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);