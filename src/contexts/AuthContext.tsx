import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth, db } from '../services/supabase';
import type { UserProfile, AuthUser } from '../types';
import { useNotification } from '../hooks/useNotificationMigration';

interface AuthContextType {
  // State
  user: AuthUser | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  
  // Actions
  signUp: (email: string, password: string, userData?: { firstName: string; lastName: string } | string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithProvider: (provider: 'google' | 'github' | 'linkedin_oidc') => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  
  // Helpers
  hasCredits: () => boolean;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hook per le notifiche unificate
  const notification = useNotification();
  
  // Refs per gestire cleanup e memory leak
  const mountedRef = useRef(true);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize auth state
  useEffect(() => {
    mountedRef.current = true;
    abortControllerRef.current = new AbortController();

    const initializeAuth = async () => {
      try {
        // Timeout per l'inizializzazione (ottimizzato a 8 secondi)
        const authPromise = auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Auth initialization timeout'));
          }, 5000); // Ottimizzato a 5 secondi
          timeoutsRef.current.add(timeout);
        });
        
        const result = await Promise.race([authPromise, timeoutPromise]) as any;
        
      if (mountedRef.current && result?.data?.session) {
          const session = result.data.session;
          setSession(session);
          
          if (session.user) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              user_metadata: session.user.user_metadata,
            });
            
            // Avvia il caricamento del profilo in background senza bloccare il rendering
            loadUserProfile(session.user.id).catch(() => {});
          }
          setLoading(false);
        }
      } catch (error) {
        if (mountedRef.current) {
          // Silenzia logging console in produzione
          // Non mostrare errore per timeout, è normale in alcune situazioni
          if (error instanceof Error && !error.message.includes('timeout')) {
            // Silenzia logging console in produzione
          }
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      
      setSession(session);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          user_metadata: session.user.user_metadata,
        });
        
        // Carica profilo in background senza bloccare
        loadUserProfile(session.user.id).catch(() => {});
      } else {
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      
      // Clear all timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Unsubscribe from auth changes
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile from database
  const loadUserProfile = async (userId: string, retryCount = 0) => {
    if (!mountedRef.current) return;
    
    try {
      // Timeout per il caricamento del profilo (ottimizzato a 8 secondi)
      const profilePromise = db.profiles.get(userId);
      const timeoutPromise = new Promise((_, reject) => {
        const timeout = setTimeout(() => reject(new Error('Profile loading timeout')), 5000); // Ottimizzato a 5 secondi
        timeoutsRef.current.add(timeout);
      });
      
      const result = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      if (result?.error) {
        // Silenzia logging console in produzione
        // Crea un profilo di default se non esiste
        if (result.error.code === 'PGRST116') {
          // Silenzia logging console in produzione
          const defaultProfile = {
            user_id: userId,
            credits: 3,
            subscription_status: 'free' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(defaultProfile as any);
        }
        return;
      }
      
      if (result?.data) {
        setProfile(result.data);
      }
    } catch (error) {
      // Retry una volta in caso di timeout, poi procedi silenziosamente
      if (error instanceof Error && error.message.includes('timeout') && retryCount === 0) {
        // Silenzia logging console in produzione
        setTimeout(() => loadUserProfile(userId, 1), 1000);
        return;
      }
      
      // Solo logga l'errore se non è un timeout al secondo tentativo
      if (!(error instanceof Error && error.message.includes('timeout'))) {
        // Silenzia logging console in produzione
      }
      
      // Non bloccare l'app se il profilo non si carica
      setProfile(null);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, userData?: { firstName: string; lastName: string } | string) => {
    try {
      setLoading(true);
      
      // Handle both string and object formats for fullName
      let fullName: string | undefined;
      if (typeof userData === 'string') {
        fullName = userData;
      } else if (userData && typeof userData === 'object') {
        fullName = `${userData.firstName} ${userData.lastName}`.trim();
      }
      
      if (import.meta.env.DEV) {
        console.log('Attempting signup with:', { email, fullName });
      }
      
      const { data, error } = await auth.signUp(email, password, fullName);
      
      if (error) {
        // Silenzia logging console in produzione
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('Invalid API key')) {
          errorMessage = 'Errore di configurazione. Contatta il supporto.';
        } else if (error.message.includes('User already registered')) {
          errorMessage = 'Un account con questa email esiste già.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'La password deve essere di almeno 6 caratteri.';
        } else if (error.message.includes('Unable to validate email address')) {
          errorMessage = 'Indirizzo email non valido.';
        } else if (error.message.includes('Database error saving new user') || error.message.includes('500')) {
          errorMessage = 'ERRORE DATABASE: La registrazione non può essere completata a causa di un problema nel database. Contatta il supporto tecnico con il codice errore: DB_HANDLE_USER_ERROR';
        }
        
        return { success: false, error: errorMessage };
      }
      
      if (data.user && !data.session) {
        notification.success('Controlla la tua email per confermare l\'account');
      }
      
      // Silenzia logging console in produzione
      return { success: true };
    } catch (error: any) {
      // Silenzia logging console in produzione
      
      let errorMessage = 'Errore durante la registrazione';
      if (error.message?.includes('500')) {
        errorMessage = 'Errore del server. Riprova tra qualche minuto.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Errore di connessione. Controlla la tua connessione internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      notification.success('Accesso effettuato con successo!');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore durante l\'accesso' };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with OAuth provider
  const signInWithProvider = async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    try {
      setLoading(true);
      const { data, error } = await auth.signInWithProvider(provider);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore durante l\'accesso con provider' };
    } finally {
      setLoading(false);
    }
  };

  // Alias per compatibilità con i componenti esistenti
  const signInWithGoogle = async () => {
    return signInWithProvider('google');
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await auth.signOut();
      
      if (error) {
        notification.error('Errore durante la disconnessione');
        return;
      }
      
      setUser(null);
      setProfile(null);
      setSession(null);
      notification.success('Disconnessione effettuata');
    } catch (error) {
      // Silenzia logging console in produzione
      notification.error('Errore durante la disconnessione');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await auth.resetPassword(email);
      
      if (error) {
        return { error: error.message };
      }
      
      notification.success('Email di reset inviata. Controlla la tua casella di posta.');
      return {};
    } catch (error: any) {
      return { error: error.message || 'Errore durante il reset della password' };
    }
  };

  // Update password
  const updatePassword = async (password: string) => {
    try {
      const { data, error } = await auth.updatePassword(password);
      
      if (error) {
        return { error: error.message };
      }
      
      notification.success('Password aggiornata con successo');
      return {};
    } catch (error: any) {
      return { error: error.message || 'Errore durante l\'aggiornamento della password' };
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: 'Utente non autenticato' };
    }
    
    try {
      const { data, error } = await db.profiles.update(user.id, updates);
      
      if (error) {
        return { error: error.message };
      }
      
      if (data) {
        setProfile(data);
        notification.success('Profilo aggiornato con successo');
      }
      
      return {};
    } catch (error: any) {
      return { error: error.message || 'Errore durante l\'aggiornamento del profilo' };
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      await loadUserProfile(user.id);
    } catch (error) {
      // Silenzia logging console in produzione
    }
  };

  // Helper functions
  const hasCredits = () => {
    return profile ? profile.credits >= 2 : false; // Ora servono almeno 2 crediti per un'analisi
  };

  const isAuthenticated = () => {
    return !!user && !!session;
  };

  const value: AuthContextType = {
    // State
    user,
    profile,
    session,
    loading,
    
    // Actions
    signUp,
    signIn,
    signInWithProvider,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    
    // Helpers
    hasCredits,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext