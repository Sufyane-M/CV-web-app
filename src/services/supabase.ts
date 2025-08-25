import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Prefer runtime origin in production; ignore misconfigured localhost URL
const envAppUrl = (import.meta.env.VITE_APP_URL || '').replace(/\/$/, '');
const appBaseUrl = envAppUrl && !envAppUrl.includes('localhost')
  ? envAppUrl
  : window.location.origin.replace(/\/$/, '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Retry utility function
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

let supabaseSingleton: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabase = () => {
  if (supabaseSingleton) return supabaseSingleton;
  supabaseSingleton = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'cv-analyzer-saas',
      },
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  return supabaseSingleton;
};

// Auth helpers
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, fullName?: string) => {
    // Ensure full_name is always a string, never an object
    const cleanFullName = typeof fullName === 'string' ? fullName.trim() : '';
    
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: cleanFullName,
        },
      },
    });
    return { data, error };
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign in with OAuth provider
  signInWithProvider: async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appBaseUrl}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await getSupabase().auth.signOut();
    return { error };
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { data, error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${appBaseUrl}/auth/reset-password`,
    });
    return { data, error };
  },

  // Update password
  updatePassword: async (password: string) => {
    const { data, error } = await getSupabase().auth.updateUser({
      password,
    });
    return { data, error };
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await getSupabase().auth.getSession();
    return { data, error };
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await getSupabase().auth.getUser();
    return { data, error };
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return getSupabase().auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // User profiles
  profiles: {
    get: async (userId: string) => {
      try {
        const result = await retryOperation(async () => {
          const { data, error } = await getSupabase()
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            throw error;
          }
          
          return { data, error };
        });
        
        if (result.error && result.error.code === 'PGRST116') {
          // No rows returned - user profile doesn't exist
          return { data: null, error: { ...result.error, code: 'PGRST116' } };
        }
        
        return result;
      } catch (error) {
        console.error('Error in profiles.get:', error);
        return { data: null, error: { message: 'Network error', details: error } };
      }
    },

    update: async (userId: string, updates: Partial<Database['public']['Tables']['user_profiles']['Update']>) => {
      const { data, error } = await getSupabase()
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      return { data, error };
    },

    deductCredit: async (userId: string) => {
      const { data, error } = await getSupabase().rpc('deduct_user_credit', {
        user_uuid: userId,
      });
      return { data, error };
    },

    addCredits: async (userId: string, credits: number) => {
      const { data, error } = await getSupabase().rpc('add_user_credits', {
        user_uuid: userId,
        credits_to_add: credits,
      });
      return { data, error };
    },

    deductOnCompletion: async (userId: string, analysisId: string) => {
      try {
        // Verifica che l'analisi sia completata
        const { data: analysis, error: analysisError } = await getSupabase()
          .from('cv_analyses')
          .select('status')
          .eq('id', analysisId)
          .eq('user_id', userId)
          .single();

        if (analysisError || !analysis || analysis.status !== 'completed') {
          return { data: null, error: new Error('Analysis not completed or not found') };
        }

        // Verifica se già detratto (idempotenza)
        const { data: existingDeduction } = await getSupabase()
          .from('credit_deductions')
          .select('id')
          .eq('analysis_id', analysisId)
          .single();

        if (existingDeduction) {
          // Già detratto, restituisci il saldo attuale
          const { data: profile } = await getSupabase()
            .from('user_profiles')
            .select('credits')
            .eq('id', userId)
            .single();
          return { data: [{ credits: profile?.credits || 0 }], error: null };
        }

        // Ottieni il profilo utente
        const { data: profile, error: profileError } = await getSupabase()
          .from('user_profiles')
          .select('credits')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          return { data: null, error: new Error('User profile not found') };
        }

        // Verifica crediti sufficienti (2 crediti)
        if ((profile.credits || 0) < 2) {
          return { data: [{ credits: profile.credits || 0 }], error: null };
        }

        // Detrai 2 crediti
        const newCredits = (profile.credits || 0) - 2;
        const { error: updateError } = await getSupabase()
          .from('user_profiles')
          .update({ 
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          return { data: null, error: updateError };
        }

        // Registra la detrazione
        await getSupabase()
          .from('credit_deductions')
          .insert({ analysis_id: analysisId, user_id: userId });

        // Registra la transazione
        await getSupabase()
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: -2,
            type: 'consumption',
            analysis_id: analysisId,
            description: 'Detrazione 2 crediti per analisi completata',
            created_at: new Date().toISOString()
          });

        return { data: [{ credits: newCredits }], error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  },



  // CV Analyses
  analyses: {
    get: async (analysisId: string) => {
      try {
        const { data, error } = await getSupabase()
          .from('cv_analyses')
          .select('*')
          .eq('id', analysisId)
          .single();
        
        if (error) {
          console.error('Error fetching analysis:', error);
          return { data: null, error };
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error in analyses.get:', error);
        return { data: null, error };
      }
    },

    create: async (analysis: Database['public']['Tables']['cv_analyses']['Insert']) => {
      try {
        const result = await retryOperation(async () => {
          const { data, error } = await getSupabase()
            .from('cv_analyses')
            .insert(analysis)
            .select()
            .single();
          if (error) throw error;
          return { data, error };
        });
        return result;
      } catch (error) {
        console.error('Error in analyses.create:', error);
        return { data: null, error } as any;
      }
    },

    update: async (analysisId: string, updates: Database['public']['Tables']['cv_analyses']['Update']) => {
      try {
        const result = await retryOperation(async () => {
          const { data, error } = await getSupabase()
            .from('cv_analyses')
            .update(updates)
            .eq('id', analysisId)
            .select()
            .single();
          if (error) throw error;
          return { data, error };
        });
        return result;
      } catch (error) {
        console.error('Error in analyses.update:', error);
        return { data: null, error } as any;
      }
    },

    list: async (userId: string, limit = 10, offset = 0) => {
      try {
        const { data, error } = await getSupabase()
          .from('cv_analyses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (error) {
          console.error('Error fetching analyses list:', error);
          return { data: [], error };
        }
        
        return { data: data || [], error };
      } catch (error) {
        console.error('Error in analyses.list:', error);
        return { data: [], error };
      }
    },

    getRecent: async (userId: string, limit = 5) => {
      try {
        const { data, error } = await getSupabase()
          .from('cv_analyses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          console.error('Error fetching recent analyses:', error);
          return { data: [], error };
        }
        
        return { data: data || [], error };
      } catch (error) {
        console.error('Error in analyses.getRecent:', error);
        return { data: [], error };
      }
    },

    delete: async (analysisId: string) => {
      try {
        const result = await retryOperation(async () => {
          const { error } = await getSupabase()
            .from('cv_analyses')
            .delete()
            .eq('id', analysisId);
          if (error) throw error;
          return { error: null as any };
        });
        return result;
      } catch (error) {
        console.error('Error in analyses.delete:', error);
        return { error } as any;
      }
    },
  },

  // Payment transactions
  transactions: {
    list: async (userId: string) => {
      const { data, error } = await getSupabase()
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (transaction: Database['public']['Tables']['payments']['Insert']) => {
      const { data, error } = await getSupabase()
        .from('payments')
        .insert(transaction)
        .select()
        .single();
      return { data, error };
    },

    update: async (id: string, updates: Database['public']['Tables']['payments']['Update']) => {
      const { data, error } = await getSupabase()
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    getByPaymentId: async (paymentIntentId: string) => {
      const { data, error } = await getSupabase()
        .from('payments')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();
      return { data, error };
    },
  },

  // Credit transactions
  creditTransactions: {
    create: async (transaction: Database['public']['Tables']['credit_transactions']['Insert']) => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .insert(transaction)
        .select()
        .single();
      return { data, error };
    },

    list: async (userId: string, limit = 50) => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },
  },
};

// Storage helpers
export const storage = {


  // Get file URL
  getFileUrl: (filePath: string) => {
    const { data } = getSupabase().storage
      .from('cv-files')
      .getPublicUrl(filePath);
    return data.publicUrl;
  },

  // Delete file
  deleteFile: async (filePath: string) => {
    const { data, error } = await getSupabase().storage
      .from('cv-files')
      .remove([filePath]);
    return { data, error };
  },

  // Download file
  downloadFile: async (filePath: string) => {
    const { data, error } = await getSupabase().storage
      .from('cv-files')
      .download(filePath);
    return { data, error };
  },
};

// Real-time subscriptions
export const realtime = {
  // Subscribe to analysis changes
  subscribeToAnalysis: (analysisId: string, callback: (payload: any) => void) => {
    return getSupabase()
      .channel(`analysis_${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cv_analyses',
          filter: `id=eq.${analysisId}`,
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to user profile changes
  subscribeToProfile: (userId: string, callback: (payload: any) => void) => {
    return getSupabase()
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },
};

// Utility functions
export const utils = {
  // Check if user has credits
  hasCredits: async (userId: string): Promise<boolean> => {
    const { data, error } = await db.profiles.get(userId);
    if (error || !data) return false;
    return data.credits >= 2; // Ora servono almeno 2 crediti per un'analisi
  },

  // Deduct credit and create transaction
  deductCreditWithTransaction: async (userId: string, analysisId: string, description = 'Analisi CV') => {
    try {
      // Start transaction
      const { data: profile, error: profileError } = await db.profiles.get(userId);
      if (profileError || !profile) {
        throw new Error('Errore nel recupero del profilo utente');
      }

      if (profile.credits <= 0) {
        throw new Error('Crediti insufficienti');
      }

      // Deduct credit
      const { error: deductError } = await db.profiles.update(userId, {
        credits: profile.credits - 1,
        updated_at: new Date().toISOString(),
      });

      if (deductError) {
        throw new Error('Errore nella deduzione del credito');
      }

      // Create credit transaction
      const { error: transactionError } = await db.creditTransactions.create({
        user_id: userId,
        type: 'consumption',
        amount: -1,
        description,
        analysis_id: analysisId,
      });

      if (transactionError) {
        console.error('Errore nella creazione della transazione:', transactionError);
        // Non bloccare l'operazione per errori di logging
      }

      return { success: true };
    } catch (error) {
      console.error('Errore nella deduzione del credito:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate UUID
  generateUUID: (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
};

// Export types for convenience
export type { Database } from '../types/database';
export type CVAnalysis = Database['public']['Tables']['cv_analyses']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row'];

export default getSupabase;