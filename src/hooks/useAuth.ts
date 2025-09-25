// import { useState, useEffect } from 'react'
// import { User, Session } from '@supabase/supabase-js'
// import { supabase } from '../lib/supabase'
// import { captureError, setUserContext, addBreadcrumb } from '../lib/sentry'

// // Extend User type to include username
// interface ExtendedUser extends User {
//   username?: string;
// }

// Mock useAuth hook for compatibility
export function useAuth() {
  return {
    user: null,
    session: null,
    loading: false,
    signInWithGoogle: async () => {},
    signOut: async () => {}
  };
}

// Original implementation commented out
// export function useAuth() {
//   const [user, setUser] = useState<ExtendedUser | null>(null)
//   const [session, setSession] = useState<Session | null>(null)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     const fetchUserProfile = async (userId: string) => {
//       try {
//         const { data: profile, error } = await supabase
//           .from('profiles')
//           .select('username, full_name, avatar_url')
//           .eq('id', userId)
//           .single();

//         if (error) {
//           console.error('Error fetching profile:', error);
//           captureError(error, { context: 'fetchUserProfile' });
//           return null;
//         }
//         return profile;
//       } catch (error) {
//         console.error('Error in fetchUserProfile:', error);
//         captureError(error as Error, { context: 'fetchUserProfile' });
//         return null;
//       }
//     };

//     const handleAuthChange = async (session: Session | null) => {
//       setSession(session);
//       if (session?.user) {
//         const profile = await fetchUserProfile(session.user.id);
//         const userWithProfile: ExtendedUser = {
//           ...session.user,
//           username: profile?.username, // Add username from profile
//           user_metadata: {
//             ...session.user.user_metadata,
//             full_name: profile?.full_name,
//             avatar_url: profile?.avatar_url,
//           },
//         };
//         setUser(userWithProfile);
//         setUserContext({
//           id: session.user.id,
//           email: session.user.email,
//           username: profile?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
//         });
//         addBreadcrumb('User session loaded/changed', 'auth', { userId: session.user.id, username: profile?.username });
//       } else {
//         setUser(null);
//         setUserContext({ id: '', email: '', username: '' });
//         addBreadcrumb('User signed out', 'auth');
//       }
//       setLoading(false);
//     };

//     // Initial session check
//     supabase.auth.getSession().then(({ data: { session }, error }) => {
//       if (error) {
//         console.error('Session error:', error);
//         captureError(error, { context: 'getSession' });
//       }
//       handleAuthChange(session);
//     });

//     // Listen for auth changes
//     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
//       console.log('Auth event:', event, session?.user?.email);
//       addBreadcrumb(`Auth state changed: ${event}`, 'auth');
//       handleAuthChange(session);
//     });

//     return () => subscription.unsubscribe();
//   }, [])

//   const signInWithGoogle = async () => {
//     try {
//       addBreadcrumb('Attempting Google sign in', 'auth');
      
//       const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: {
//           redirectTo: window.location.origin,
//           queryParams: {
//             access_type: 'offline',
//             prompt: 'consent',
//           },
//         }
//       })
      
//       if (error) {
//         console.error('OAuth Error:', error)
//         captureError(error, { 
//           context: 'signInWithGoogle',
//           provider: 'google',
//           redirectTo: window.location.origin
//         });
//         throw error
//       }
      
//       addBreadcrumb('Google sign in initiated', 'auth');
//       return data
//     } catch (error) {
//       console.error('Sign in error:', error)
//       captureError(error as Error, { context: 'signInWithGoogle' });
//       throw error
//     }
//   }

//   const signOut = async () => {
//     try {
//       addBreadcrumb('Attempting sign out', 'auth');
      
//       const { error } = await supabase.auth.signOut()
//       if (error) {
//         console.error('Error signing out:', error.message)
//         captureError(error, { context: 'signOut' });
//         throw error
//       }
      
//       addBreadcrumb('Sign out successful', 'auth');
//     } catch (error) {
//       captureError(error as Error, { context: 'signOut' });
//       throw error
//     }
//   }

//   return {
//     user,
//     session,
//     loading,
//     signInWithGoogle,
//     signOut
//   }
// }