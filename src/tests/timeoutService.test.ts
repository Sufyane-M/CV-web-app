import { timeoutService } from '../services/timeoutService';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('TimeoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isAnalysisTimedOut', () => {
    it('should return true for analysis older than 5 minutes', () => {
      const oldDate = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      const analysis = {
        id: 'test-id',
        created_at: oldDate.toISOString(),
        status: 'processing' as const
      };

      const result = timeoutService.isAnalysisTimedOut(analysis);
      expect(result).toBe(true);
    });

    it('should return false for analysis newer than 5 minutes', () => {
      const recentDate = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
      const analysis = {
        id: 'test-id',
        created_at: recentDate.toISOString(),
        status: 'processing' as const
      };

      const result = timeoutService.isAnalysisTimedOut(analysis);
      expect(result).toBe(false);
    });

    it('should return false for completed analysis regardless of age', () => {
      const oldDate = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      const analysis = {
        id: 'test-id',
        created_at: oldDate.toISOString(),
        status: 'completed' as const
      };

      const result = timeoutService.isAnalysisTimedOut(analysis);
      expect(result).toBe(false);
    });
  });

  describe('handleTimeoutAnalyses', () => {
    it('should handle multiple timed out analyses successfully', async () => {
      const timedOutAnalyses = [
        {
          id: 'analysis-1',
          user_id: 'user-1',
          file_name: 'cv1.pdf',
          status: 'processing' as const,
          created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString()
        },
        {
          id: 'analysis-2',
          user_id: 'user-2',
          file_name: 'cv2.pdf',
          status: 'processing' as const,
          created_at: new Date(Date.now() - 7 * 60 * 1000).toISOString()
        }
      ];

      // Mock successful database queries
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: timedOutAnalyses,
              error: null
            })
          })
        })
      } as any);

      // Mock successful RPC calls
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Analysis timeout handled successfully' },
        error: null
      });

      const result = await timeoutService.handleTimeoutAnalyses();

      expect(result.success).toBe(true);
      expect(result.processedAnalyses).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.details).toHaveLength(2);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should handle RPC function errors gracefully', async () => {
      const timedOutAnalysis = {
        id: 'analysis-1',
        user_id: 'user-1',
        file_name: 'cv1.pdf',
        status: 'processing' as const,
        created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString()
      };

      // Mock database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [timedOutAnalysis],
              error: null
            })
          })
        })
      } as any);

      // Mock RPC function error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function failed', code: 'P0001' }
      });

      // Mock manual fallback success
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any);

      const result = await timeoutService.handleTimeoutAnalyses();

      expect(result.success).toBe(true);
      expect(result.processedAnalyses).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.details[0].action).toBe('manual_fallback');
    });

    it('should return empty result when no timed out analyses found', async () => {
      // Mock empty database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      } as any);

      const result = await timeoutService.handleTimeoutAnalyses();

      expect(result.success).toBe(true);
      expect(result.processedAnalyses).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.details).toHaveLength(0);
    });

    it('should handle database query errors', async () => {
      // Mock database query error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed', code: '08000' }
            })
          })
        })
      } as any);

      const result = await timeoutService.handleTimeoutAnalyses();

      expect(result.success).toBe(false);
      expect(result.processedAnalyses).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database connection failed');
    });
  });

  describe('forceTimeoutAnalysis', () => {
    it('should force timeout a specific analysis', async () => {
      const analysisId = 'test-analysis-id';
      
      // Mock successful RPC call
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Analysis timeout handled successfully' },
        error: null
      });

      const result = await timeoutService.forceTimeoutAnalysis(analysisId);

      expect(result.success).toBe(true);
      expect(result.processedAnalyses).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('handle_analysis_timeout', {
        analysis_id: analysisId
      });
    });

    it('should handle RPC errors when forcing timeout', async () => {
      const analysisId = 'test-analysis-id';
      
      // Mock RPC error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Analysis not found', code: 'P0002' }
      });

      const result = await timeoutService.forceTimeoutAnalysis(analysisId);

      expect(result.success).toBe(false);
      expect(result.processedAnalyses).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Analysis not found');
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring correctly', () => {
      const mockCallback = jest.fn();
      
      // Start monitoring
      timeoutService.startTimeoutMonitoring(1, mockCallback); // 1 minute interval
      
      // Fast-forward time
      jest.advanceTimersByTime(60000); // 1 minute
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      
      // Fast-forward again
      jest.advanceTimersByTime(60000); // Another minute
      
      expect(mockCallback).toHaveBeenCalledTimes(2);
      
      // Stop monitoring
      timeoutService.stopTimeoutMonitoring();
      
      // Fast-forward again - callback should not be called
      jest.advanceTimersByTime(60000);
      
      expect(mockCallback).toHaveBeenCalledTimes(2); // Still 2
    });

    it('should handle monitoring callback errors gracefully', () => {
      const mockCallback = jest.fn().mockRejectedValue(new Error('Callback error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      timeoutService.startTimeoutMonitoring(1, mockCallback);
      
      jest.advanceTimersByTime(60000);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Errore durante il controllo automatico dei timeout:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});

// Test di integrazione per la funzione PostgreSQL
describe('PostgreSQL handle_analysis_timeout function', () => {
  // Questi test richiederebbero una connessione reale al database
  // In un ambiente di test, potresti usare un database di test
  
  it.skip('should handle analysis timeout atomically', async () => {
    // Test di integrazione che richiede un database reale
    // Implementare quando si ha accesso a un database di test
  });

  it.skip('should restore credits correctly', async () => {
    // Test per verificare il ripristino dei crediti
  });

  it.skip('should handle non-existent analysis gracefully', async () => {
    // Test per analisi inesistenti
  });
});