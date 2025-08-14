export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cv_analyses: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          file_url: string | null
          job_description: string
          analysis_type: string
          status: 'processing' | 'completed' | 'failed'
          executive_summary: string | null
          match_analysis: Json | null
          overall_score: number | null
          ats_score: number | null
          content_score: number | null
          design_score: number | null
          suggestions: Json | null
          raw_response: Json | null
          created_at: string
          updated_at: string
          file_path: string | null
          can_upgrade: boolean
          upgraded_from: string | null
          results: Json | null
        }
        Insert: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          file_url?: string | null
          job_description: string
          analysis_type?: string
          status?: 'processing' | 'completed' | 'failed'
          executive_summary?: string | null
          match_analysis?: Json | null
          overall_score?: number | null
          ats_score?: number | null
          content_score?: number | null
          design_score?: number | null
          suggestions?: Json | null
          raw_response?: Json | null
          created_at?: string
          updated_at?: string
          file_path?: string | null
          can_upgrade?: boolean
          upgraded_from?: string | null
          results?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number
          file_url?: string | null
          job_description?: string
          analysis_type?: string
          status?: 'processing' | 'completed' | 'failed'
          executive_summary?: string | null
          match_analysis?: Json | null
          overall_score?: number | null
          ats_score?: number | null
          content_score?: number | null
          design_score?: number | null
          suggestions?: Json | null
          raw_response?: Json | null
          created_at?: string
          updated_at?: string
          file_path?: string | null
          can_upgrade?: boolean
          upgraded_from?: string | null
          results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_analyses_upgraded_from_fkey"
            columns: ["upgraded_from"]
            isOneToOne: false
            referencedRelation: "cv_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          credits: number
          subscription_status: string
          subscription_id: string | null
          customer_id: string | null
          created_at: string
          updated_at: string
          total_credits_purchased: number
          has_used_free_analysis: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          credits?: number
          subscription_status?: string
          subscription_id?: string | null
          customer_id?: string | null
          created_at?: string
          updated_at?: string
          total_credits_purchased?: number
          has_used_free_analysis?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          credits?: number
          subscription_status?: string
          subscription_id?: string | null
          customer_id?: string | null
          created_at?: string
          updated_at?: string
          total_credits_purchased?: number
          has_used_free_analysis?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string
          stripe_payment_intent_id: string
          amount: number
          currency: string
          status: string
          credits_purchased: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_intent_id: string
          amount: number
          currency: string
          status: string
          credits_purchased: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_intent_id?: string
          amount?: number
          currency?: string
          status?: string
          credits_purchased?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string | null
          amount: number
          type: string
          payment_id: string | null
          analysis_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          amount: number
          type: string
          payment_id?: string | null
          analysis_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          amount?: number
          type?: string
          payment_id?: string | null
          analysis_id?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          processed: boolean
          created_at: string
          data: Json | null
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          processed?: boolean
          created_at?: string
          data?: Json | null
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          processed?: boolean
          created_at?: string
          data?: Json | null
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          activity_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          activity_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          activity_data?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipi di utilità per l'analisi CV
export interface CVAnalysisSuggestion {
  type: 'critical' | 'warning' | 'success';
  text: string;
  category?: string;
}

export interface CVAnalysisScores {
  overall_score: number;
  ats_score: number;
  content_score: number;
  design_score: number;
}

export interface CVAnalysisMatchData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface CVAnalysisResults {
  executive_summary: string;
  match_analysis: CVAnalysisMatchData | null;
  scores: CVAnalysisScores;
  suggestions: {
    critical: CVAnalysisSuggestion[];
    warnings: CVAnalysisSuggestion[];
    successes: CVAnalysisSuggestion[];
  };
}

export type CVAnalysisStatus = 'processing' | 'completed' | 'failed';
export type AnalysisType = 'free' | 'premium';
export type ScanType = 'limited' | 'complete';