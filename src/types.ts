
// Database types for Supabase
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  credits: number;
  subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
  subscription_id?: string;
  customer_id?: string;
  created_at: string;
  updated_at: string;
}



export interface PaymentTransaction {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string;
  stripe_checkout_session_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  credits_purchased: number;
  credits_added: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };

      payments: {
        Row: PaymentTransaction;
        Insert: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
