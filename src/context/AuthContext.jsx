import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId, userEmail, userMeta) {
    let { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    const oauthRole = localStorage.getItem('oauth_selected_role');
    
    if (!data) {
      const initialRole = oauthRole || 'student';
      const { data: newData } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          role: initialRole,
          full_name: userMeta?.full_name || userEmail?.split('@')[0] || 'User'
        })
        .select()
        .single();
      data = newData;
      if (oauthRole) localStorage.removeItem('oauth_selected_role');
    } else if (oauthRole && data.role !== oauthRole) {
      const { data: updatedData } = await supabase
        .from('profiles')
        .update({ role: oauthRole })
        .eq('id', userId)
        .select()
        .single();
      if (updatedData) data = updatedData;
      localStorage.removeItem('oauth_selected_role');
    }
    
    setProfile(data || null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const value = { session, profile, loading, signOut, user: session?.user || null };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
