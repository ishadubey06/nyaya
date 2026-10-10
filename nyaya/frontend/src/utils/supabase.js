/**
 * Standalone auth stub to run cleanly without external Supabase dependency.
 */
export const supabase = {
  auth: {
    getSession: async () => ({
      data: {
        session: {
          access_token: 'local-session-token',
          user: {
            id: 'local-user-123',
            email: 'citizen@nyaya.ai',
            user_metadata: { full_name: 'Local Citizen' }
          }
        }
      },
      error: null
    }),
    onAuthStateChange: (callback) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signUp: async () => ({ data: { user: { id: 'local-user-123' }, session: { access_token: 'local-session-token' } }, error: null }),
    signInWithPassword: async () => ({ data: { user: { id: 'local-user-123' }, session: { access_token: 'local-session-token' } }, error: null }),
    signInWithOtp: async () => ({ error: null }),
    verifyOtp: async () => ({ data: { user: { id: 'local-user-123' }, session: { access_token: 'local-session-token' } }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    signInWithOAuth: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  }
};
