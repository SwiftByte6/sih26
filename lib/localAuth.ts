export interface User {
  id: string;
  email: string;
}

export interface Session {
  user: User;
}

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT';
type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;

const USERS_STORAGE_KEY = 'amr_demo_users';
const SESSION_STORAGE_KEY = 'amr_demo_session';

const DEFAULT_DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@example.com',
};

// Internal helper to get stored users
const getStoredUsers = (): Array<{ id: string; email: string; password?: string }> => {
  if (typeof window === 'undefined') return [DEFAULT_DEMO_USER];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const initialUsers = [{ ...DEFAULT_DEMO_USER, password: 'demo123' }];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [DEFAULT_DEMO_USER];
  }
};

// Internal helper to get current session
const getStoredSession = (): Session | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      return { user };
    }
    // Auto-login default demo user on first visit for easy demonstration
    const defaultUserSession = { user: DEFAULT_DEMO_USER };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_USER));
    return defaultUserSession;
  } catch (e) {
    return null;
  }
};

const listeners = new Set<AuthStateCallback>();

const notifyListeners = (event: AuthChangeEvent, session: Session | null) => {
  listeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (e) {
      console.error('Auth state listener error:', e);
    }
  });
};

export const localAuth = {
  auth: {
    async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    async getUser(): Promise<{ data: { user: User | null }; error: null }> {
      const session = getStoredSession();
      return { data: { user: session?.user ?? null }, error: null };
    },

    onAuthStateChange(callback: AuthStateCallback) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback);
            },
          },
        },
      };
    },

    async signInWithPassword({
      email,
      password,
    }: {
      email: string;
      password?: string;
    }): Promise<{ data: { user: User; session: Session } | null; error: { message: string } | null }> {
      const users = getStoredUsers();
      const normEmail = email.toLowerCase().trim();
      const existingUser = users.find((u) => u.email.toLowerCase() === normEmail);

      if (!existingUser) {
        // If user doesn't exist, create account on the fly for smooth demonstration
        const newUser: User = {
          id: `demo-user-${Date.now()}`,
          email: normEmail,
        };
        users.push({ ...newUser, password });
        if (typeof window !== 'undefined') {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
        }
        const session = { user: newUser };
        notifyListeners('SIGNED_IN', session);
        return { data: { user: newUser, session }, error: null };
      }

      const user: User = { id: existingUser.id, email: existingUser.email };
      const session = { user };
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      }
      notifyListeners('SIGNED_IN', session);
      return { data: { user, session }, error: null };
    },

    async signUp({
      email,
      password,
    }: {
      email: string;
      password?: string;
    }): Promise<{ data: { user: User; session: Session } | null; error: { message: string } | null }> {
      const users = getStoredUsers();
      const normEmail = email.toLowerCase().trim();
      
      const newUser: User = {
        id: `demo-user-${Date.now()}`,
        email: normEmail,
      };

      const existingIndex = users.findIndex((u) => u.email.toLowerCase() === normEmail);
      if (existingIndex >= 0) {
        users[existingIndex] = { ...newUser, password };
      } else {
        users.push({ ...newUser, password });
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
      }

      const session = { user: newUser };
      notifyListeners('SIGNED_IN', session);
      return { data: { user: newUser, session }, error: null };
    },

    async signOut(): Promise<{ error: null }> {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      notifyListeners('SIGNED_OUT', null);
      return { error: null };
    },
  },
};
