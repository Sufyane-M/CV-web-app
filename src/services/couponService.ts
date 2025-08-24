import { getSupabase } from './supabase';
import type { Database } from '../types/database';

type Coupon = Database['public']['Tables']['coupons']['Row'];
type CouponUsage = Database['public']['Tables']['coupon_usage']['Row'];
type CouponInsert = Database['public']['Tables']['coupons']['Insert'];
type CouponUsageInsert = Database['public']['Tables']['coupon_usage']['Insert'];

export interface CouponValidationResult {
  isValid: boolean;
  couponId?: string;
  discountAmount?: number;
  errorMessage?: string;
  coupon?: Coupon;
}

export interface ApplyCouponResult {
  success: boolean;
  discountAmount?: number;
  finalAmount?: number;
  errorMessage?: string;
}

export const couponService = {
  /**
   * Valida un coupon per un utente e importo specifici
   */
  validateCoupon: async (
    code: string,
    userId: string,
    amount: number
  ): Promise<CouponValidationResult> => {
    try {
      const supabase = getSupabase();
      
      // Chiama la funzione di validazione nel database
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code,
        p_user_id: userId,
        p_amount: amount
      });

      if (error) {
        console.error('Errore nella validazione del coupon:', error);
        return {
          isValid: false,
          errorMessage: 'Errore nella validazione del coupon'
        };
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          errorMessage: 'Coupon non valido'
        };
      }

      const result = data[0];
      
      if (!result.is_valid) {
        return {
          isValid: false,
          errorMessage: result.error_message || 'Coupon non valido'
        };
      }

      // Se il coupon è valido, recupera i dettagli completi
      const { data: couponData, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', result.coupon_id)
        .single();

      return {
        isValid: true,
        couponId: result.coupon_id,
        discountAmount: result.discount_amount,
        coupon: couponData || undefined
      };
    } catch (error) {
      console.error('Errore nella validazione del coupon:', error);
      return {
        isValid: false,
        errorMessage: 'Errore del sistema'
      };
    }
  },

  /**
   * Applica un coupon a un pagamento
   */
  applyCoupon: async (
    couponId: string,
    userId: string,
    paymentId: string,
    originalAmount: number,
    discountAmount: number,
    stripeCouponId?: string
  ): Promise<ApplyCouponResult> => {
    try {
      const supabase = getSupabase();
      
      // Chiama la funzione di applicazione nel database
      const { data, error } = await supabase.rpc('apply_coupon', {
        p_coupon_id: couponId,
        p_user_id: userId,
        p_payment_id: paymentId,
        p_original_amount: originalAmount,
        p_discount_amount: discountAmount,
        p_stripe_coupon_id: stripeCouponId
      });

      if (error) {
        console.error('Errore nell\'applicazione del coupon:', error);
        return {
          success: false,
          errorMessage: 'Errore nell\'applicazione del coupon'
        };
      }

      if (!data) {
        return {
          success: false,
          errorMessage: 'Impossibile applicare il coupon'
        };
      }

      return {
        success: true,
        discountAmount,
        finalAmount: originalAmount - discountAmount
      };
    } catch (error) {
      console.error('Errore nell\'applicazione del coupon:', error);
      return {
        success: false,
        errorMessage: 'Errore del sistema'
      };
    }
  },

  /**
   * Recupera tutti i coupon attivi
   */
  getActiveCoupons: async (): Promise<{ data: Coupon[] | null; error: any }> => {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Errore nel recupero dei coupon:', error);
      return { data: null, error };
    }
  },

  /**
   * Recupera l'utilizzo dei coupon per un utente
   */
  getUserCouponUsage: async (
    userId: string
  ): Promise<{ data: CouponUsage[] | null; error: any }> => {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('coupon_usage')
        .select(`
          *,
          coupon:coupons(*),
          payment:payments(*)
        `)
        .eq('user_id', userId)
        .order('used_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Errore nel recupero dell\'utilizzo dei coupon:', error);
      return { data: null, error };
    }
  },

  /**
   * Crea un nuovo coupon (solo per admin)
   */
  createCoupon: async (coupon: CouponInsert): Promise<{ data: Coupon | null; error: any }> => {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('coupons')
        .insert(coupon)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Errore nella creazione del coupon:', error);
      return { data: null, error };
    }
  },

  /**
   * Aggiorna un coupon esistente (solo per admin)
   */
  updateCoupon: async (
    id: string,
    updates: Partial<CouponInsert>
  ): Promise<{ data: Coupon | null; error: any }> => {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Errore nell\'aggiornamento del coupon:', error);
      return { data: null, error };
    }
  },

  /**
   * Disattiva un coupon
   */
  deactivateCoupon: async (id: string): Promise<{ data: Coupon | null; error: any }> => {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('coupons')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Errore nella disattivazione del coupon:', error);
      return { data: null, error };
    }
  },

  /**
   * Recupera le statistiche di utilizzo di un coupon
   */
  getCouponStats: async (couponId: string) => {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('coupon_usage')
        .select('discount_amount, used_at')
        .eq('coupon_id', couponId);

      if (error) {
        return { data: null, error };
      }

      const totalUsage = data?.length || 0;
      const totalDiscount = data?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;
      const avgDiscount = totalUsage > 0 ? totalDiscount / totalUsage : 0;

      return {
        data: {
          totalUsage,
          totalDiscount,
          avgDiscount,
          usageHistory: data
        },
        error: null
      };
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      return { data: null, error };
    }
  },

  /**
   * Calcola lo sconto per un coupon e importo specifici
   */
  calculateDiscount: (coupon: Coupon, amount: number): number => {
    if (coupon.discount_type === 'percentage') {
      let discount = Math.round(amount * coupon.discount_value / 100);
      
      // Applica il limite massimo di sconto se specificato
      if (coupon.maximum_discount && discount > coupon.maximum_discount) {
        discount = coupon.maximum_discount;
      }
      
      return discount;
    } else {
      // Fixed amount - converti in centesimi
      const fixedDiscount = Math.round(coupon.discount_value * 100);
      
      // Non può essere maggiore dell'importo totale
      return Math.min(fixedDiscount, amount);
    }
  },

  /**
   * Formatta il valore dello sconto per la visualizzazione
   */
  formatDiscountValue: (coupon: Coupon): string => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    } else {
      return `€${coupon.discount_value.toFixed(2)}`;
    }
  },

  /**
   * Verifica se un coupon è ancora valido (controlli base)
   */
  isCouponValid: (coupon: Coupon): boolean => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    return (
      coupon.is_active &&
      now >= validFrom &&
      (!validUntil || now <= validUntil) &&
      (!coupon.usage_limit || coupon.usage_count < coupon.usage_limit)
    );
  }
};

export default couponService;