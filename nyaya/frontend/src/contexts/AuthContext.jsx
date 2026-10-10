import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

const DEFAULT_LOCAL_USER = {
  id: 'local-user-123',
  email: 'citizen@nyaya.ai',
  user_metadata: { full_name: 'Local Citizen' }
};

const DEFAULT_LOCAL_SESSION = {
  access_token: 'mock-token-local-user',
  user: DEFAULT_LOCAL_USER,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const isLoggedOut = localStorage.getItem('nyaya_logged_out') === 'true';
    if (isLoggedOut) return null;
    return DEFAULT_LOCAL_USER;
  });
  const [session, setSession] = useState(() => {
    const isLoggedOut = localStorage.getItem('nyaya_logged_out') === 'true';
    if (isLoggedOut) return null;
    return DEFAULT_LOCAL_SESSION;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      // Get initial Supabase session if available
      supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
        if (supaSession?.user) {
          setSession(supaSession);
          setUser(supaSession.user);
          localStorage.removeItem('nyaya_logged_out');
        }
      }).catch(() => {});

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
        if (supaSession?.user) {
          setSession(supaSession);
          setUser(supaSession.user);
          localStorage.removeItem('nyaya_logged_out');
        }
      });

      return () => subscription.unsubscribe();
    } catch (e) {}
  }, []);

  const loginAsGuest = () => {
    localStorage.removeItem('nyaya_logged_out');
    setUser(DEFAULT_LOCAL_USER);
    setSession(DEFAULT_LOCAL_SESSION);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.setItem('nyaya_logged_out', 'true');
    setUser(null);
    setSession(null);
  };

  const getAccessToken = async () => {
    try {
      const { data: { session: supaSession } } = await supabase.auth.getSession();
      if (supaSession?.access_token) return supaSession.access_token;
    } catch (e) {}
    return user ? 'mock-token-local-user' : null;
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    loginAsGuest,
    getAccessToken,
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
