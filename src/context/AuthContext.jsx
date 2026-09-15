import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../hooks/useAuth';

// Fetch the public profile associated with the user UID
const createFallbackProfile = async (sessionUser) => {
  if (!sessionUser) return null;

  const email = sessionUser.email || '';
  const metadata = sessionUser.user_metadata || {};
  const emailPrefix = email.split('@')[0] || 'yapper';
  const baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'yapper';

  let username = baseUsername;
  let attempt = 0;

  while (attempt < 5) {
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking username availability:', checkError.message);
      break;
    }

    if (!existing) {
      break;
    }

    username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
    attempt += 1;
  }

  const fullName = metadata.full_name || metadata.name || emailPrefix;
  const avatarUrl = metadata.avatar_url || metadata.picture || '';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: sessionUser.id,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating fallback profile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Create fallback profile caught error:', err);
    return null;
  }
};

const fetchProfile = async (userId, sessionUser = null) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error.message);
      return null;
    }

    if (data) {
      return data;
    }

    if (sessionUser) {
      return await createFallbackProfile(sessionUser);
    }

    return null;
  } catch (err) {
    console.error('Fetch profile caught error:', err);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clear legacy mock seeds from localStorage on startup
  useEffect(() => {
    localStorage.removeItem('yappers_bypass_user');
    localStorage.removeItem('yappers_local_posts');
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const updatedProfile = await fetchProfile(user.id, user);
      if (updatedProfile) setProfile(updatedProfile);
      return updatedProfile;
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timer to unblock UI after 800ms max
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 800);

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const emailPrefix = (currentSession.user.email || '').split('@')[0] || 'user';
          const meta = currentSession.user.user_metadata || {};
          const optimisticProf = {
            id: currentSession.user.id,
            username: meta.username || emailPrefix,
            full_name: meta.full_name || meta.name || emailPrefix,
            avatar_url: meta.avatar_url || meta.picture || '',
          };
          setProfile(optimisticProf);

          fetchProfile(currentSession.user.id, currentSession.user).then((prof) => {
            if (isMounted && prof) {
              setProfile(prof);
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Auth init error:', err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        const emailPrefix = (currentSession.user.email || '').split('@')[0] || 'user';
        const meta = currentSession.user.user_metadata || {};
        const optimisticProf = {
          id: currentSession.user.id,
          username: meta.username || emailPrefix,
          full_name: meta.full_name || meta.name || emailPrefix,
          avatar_url: meta.avatar_url || meta.picture || '',
        };
        setProfile(optimisticProf);

        fetchProfile(currentSession.user.id, currentSession.user).then((prof) => {
          if (isMounted && prof) {
            setProfile(prof);
          }
        }).catch(() => {});
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Supabase Google OAuth error:', error.message);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('yappers_bypass_user');
    localStorage.removeItem('yappers_local_posts');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
