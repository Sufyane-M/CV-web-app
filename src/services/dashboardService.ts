import { getSupabase } from './supabase';
import type { CVAnalysis } from './supabase';
import { cacheService, CacheKeys } from './cacheService';

export interface DashboardStats {
  totalAnalyses: number;
  userCredits: number;
  userProfile: any;
  hasFreeAnalysisAvailable: boolean;
}

export const dashboardService = {
  async getStats(userId: string): Promise<DashboardStats> {
    try {
      return await cacheService.getOrFetch(
        CacheKeys.DASHBOARD_STATS(userId),
        async () => {
          // Get user profile with credits
          const { data: profile, error: profileError } = await getSupabase()
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            throw profileError;
          }

          // Get total analyses count
          const { count: totalAnalyses, error: analysesError } = await getSupabase()
            .from('cv_analyses')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

          if (analysesError) {
            console.error('Error fetching analyses count:', analysesError);
            throw analysesError;
          }

          return {
            totalAnalyses: totalAnalyses || 0,
            userCredits: profile?.credits || 0,
            userProfile: profile,
            hasFreeAnalysisAvailable: !profile?.has_used_free_analysis
          };
        },
        5 * 60 * 1000 // 5 minuti TTL per statistiche dashboard
      );
    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  },

  async getRecentAnalyses(userId: string, limit: number = 5): Promise<CVAnalysis[]> {
    try {
      const cacheKey = `${CacheKeys.RECENT_ANALYSES(userId)}:${limit}`;
      
      return await cacheService.getOrFetch(
        cacheKey,
        async () => {
          const { data, error } = await getSupabase()
            .from('cv_analyses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            console.error('Error fetching recent analyses:', error);
            throw error;
          }

          return data || [];
        },
        3 * 60 * 1000 // 3 minuti TTL per analisi recenti
      );
    } catch (error) {
      console.error('Error in getRecentAnalyses:', error);
      throw error;
    }
  },

  /**
   * Invalida la cache delle statistiche dashboard per un utente
   */
  invalidateUserCache(userId: string): void {
    cacheService.invalidatePattern(`dashboard:.*:${userId}`);
  },

  /**
   * Invalida la cache quando i crediti dell'utente cambiano
   */
  invalidateCreditsCache(userId: string): void {
    cacheService.delete(CacheKeys.DASHBOARD_STATS(userId));
    cacheService.delete(CacheKeys.USER_PROFILE(userId));
  }
};