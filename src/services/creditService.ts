import { db } from './supabase';
import type { UserProfile } from '../types';

// Costante per i crediti richiesti per analisi a pagamento
export const CREDITS_PER_PAID_ANALYSIS = 2;

export interface AnalysisEligibility {
  canAnalyze: boolean;
  analysisType: 'free' | 'paid';
  reason?: string;
  creditsRequired: number;
  creditsAvailable: number;
  hasFreeAnalysisAvailable: boolean;
}

export interface CreditPackage {
  id: string;
  name: string;
  price: number; // in cents
  credits: number;
  description: string;
  stripePriceId: string;
}

// Definizione dei pacchetti secondo le specifiche
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 499, // €4,99
    credits: 4,
    description: 'Due analisi complete del CV (4 crediti)',
    stripePriceId: 'price_1RtUD3CrDiPBhim5deeUX1IW' // Starter Pack
  },
  {
    id: 'premium',
    name: 'Pacchetto Premium', 
    price: 999, // €9,99
    credits: 10,
    description: 'Cinque analisi complete del CV (10 crediti)',
    stripePriceId: 'price_1RtUD8CrDiPBhim5Ba5aMNou' // Value Pack
  }
];

class CreditService {
  /**
   * Verifica se l'utente può effettuare un'analisi
   */
  async checkAnalysisEligibility(userId: string): Promise<AnalysisEligibility> {
    try {
      const { data: profile, error } = await db.profiles.get(userId);
      
      if (error || !profile) {
        return {
          canAnalyze: false,
          analysisType: 'free',
          reason: 'Profilo utente non trovato',
          creditsRequired: 0,
          creditsAvailable: 0,
          hasFreeAnalysisAvailable: false
        };
      }

      const hasFreeAnalysisAvailable = !profile.has_used_free_analysis;
      const creditsAvailable = profile.credits ?? 0;

      // Se ha l'analisi gratuita disponibile
      if (hasFreeAnalysisAvailable) {
        return {
          canAnalyze: true,
          analysisType: 'free',
          creditsRequired: 0,
          creditsAvailable,
          hasFreeAnalysisAvailable: true
        };
      }

      // Se ha crediti disponibili (richiede CREDITS_PER_PAID_ANALYSIS crediti)
      if (creditsAvailable >= CREDITS_PER_PAID_ANALYSIS) {
        return {
          canAnalyze: true,
          analysisType: 'paid',
          creditsRequired: CREDITS_PER_PAID_ANALYSIS,
          creditsAvailable,
          hasFreeAnalysisAvailable: false
        };
      }

      // Nessuna analisi disponibile
      return {
        canAnalyze: false,
        analysisType: 'paid',
        reason: `Crediti insufficienti (richiesti ${CREDITS_PER_PAID_ANALYSIS} crediti). Acquista un pacchetto per continuare.`,
        creditsRequired: CREDITS_PER_PAID_ANALYSIS,
        creditsAvailable,
        hasFreeAnalysisAvailable: false
      };

    } catch (error) {
      console.error('Errore nel controllo eligibilità:', error);
      return {
        canAnalyze: false,
        analysisType: 'free',
        reason: 'Errore nel controllo dei crediti',
        creditsRequired: 0,
        creditsAvailable: 0,
        hasFreeAnalysisAvailable: false
      };
    }
  }

  /**
   * Consuma l'analisi gratuita
   */
  async consumeFreeAnalysis(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: profile, error: getError } = await db.profiles.get(userId);
      
      if (getError || !profile) {
        return { success: false, error: 'Profilo utente non trovato' };
      }

      if (profile.has_used_free_analysis) {
        return { success: false, error: 'Analisi gratuita già utilizzata' };
      }

      // Aggiorna il profilo per marcare l'analisi gratuita come utilizzata
      const { error: updateError } = await db.profiles.update(userId, {
        has_used_free_analysis: true,
        updated_at: new Date().toISOString()
      });

      if (updateError) {
        console.error('Errore nell\'aggiornamento profilo:', updateError);
        return { success: false, error: 'Errore nell\'aggiornamento del profilo' };
      }

      return { success: true };

    } catch (error) {
      console.error('Errore nel consumo analisi gratuita:', error);
      return { success: false, error: 'Errore interno' };
    }
  }

  /**
   * Consuma crediti per analisi a pagamento usando operazione atomica
   */
  async consumeCredit(userId: string, analysisId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Usa la funzione atomica del database per evitare race conditions
      const { data: success, error: rpcError } = await db.rpc('consume_paid_credits', {
        p_user_id: userId,
        p_credits: CREDITS_PER_PAID_ANALYSIS,
        p_analysis_id: analysisId
      });

      if (rpcError) {
        console.error('Errore nella chiamata RPC consume_paid_credits:', rpcError);
        return { success: false, error: 'Errore interno nella deduzione crediti' };
      }

      if (!success) {
        return { success: false, error: `Crediti insufficienti (richiesti ${CREDITS_PER_PAID_ANALYSIS} crediti)` };
      }

      return { success: true };

    } catch (error) {
      console.error('Errore nel consumo credito:', error);
      return { success: false, error: 'Errore interno' };
    }
  }

  /**
   * Aggiunge crediti dopo un acquisto
   */
  async addCreditsAfterPurchase(
    userId: string, 
    credits: number, 
    paymentData: {
      customerId?: string;
      subscriptionId?: string;
      paymentIntentId?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: profile, error: getError } = await db.profiles.get(userId);
      
      if (getError || !profile) {
        return { success: false, error: 'Profilo utente non trovato' };
      }

      // Prepara gli aggiornamenti
      const updates: any = {
        credits: (profile.credits ?? 0) + credits,
        total_credits_purchased: (profile.total_credits_purchased ?? 0) + credits,
        last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Aggiungi customer_id se è il primo acquisto
      if (paymentData.customerId && !profile.customer_id) {
        updates.customer_id = paymentData.customerId;
      }

      // Aggiungi subscription_id se presente
      if (paymentData.subscriptionId) {
        updates.subscription_id = paymentData.subscriptionId;
      }

      // Aggiorna il profilo
      const { error: updateError } = await db.profiles.update(userId, updates);

      if (updateError) {
        console.error('Errore nell\'aggiornamento crediti:', updateError);
        return { success: false, error: 'Errore nell\'aggiornamento dei crediti' };
      }

      // Registra la transazione di acquisto
      const { error: transactionError } = await db.creditTransactions.create({
        user_id: userId,
        type: 'purchase',
        amount: credits,
        description: `Acquisto pacchetto - ${credits} crediti`,
        payment_intent_id: paymentData.paymentIntentId
      });

      if (transactionError) {
        console.error('Errore nella registrazione transazione acquisto:', transactionError);
        // Non bloccare l'operazione per errori di logging
      }

      return { success: true };

    } catch (error) {
      console.error('Errore nell\'aggiunta crediti:', error);
      return { success: false, error: 'Errore interno' };
    }
  }

  /**
   * Ottiene il pacchetto per ID
   */
  getPackageById(packageId: string): CreditPackage | null {
    return CREDIT_PACKAGES.find(pkg => pkg.id === packageId) || null;
  }

  /**
   * Ottiene il pacchetto per Stripe Price ID
   */
  getPackageByPriceId(priceId: string): CreditPackage | null {
    return CREDIT_PACKAGES.find(pkg => pkg.stripePriceId === priceId) || null;
  }

  /**
   * Ottiene tutti i pacchetti disponibili
   */
  getAllPackages(): CreditPackage[] {
    return CREDIT_PACKAGES;
  }

  /**
   * Formatta il prezzo in euro
   */
  formatPrice(priceInCents: number): string {
    return `€${(priceInCents / 100).toFixed(2)}`;
  }

  /**
   * Verifica lo stato dell'utente per debug
   */
  async getUserStatus(userId: string): Promise<{
    profile: UserProfile | null;
    eligibility: AnalysisEligibility;
    error?: string;
  }> {
    try {
      const { data: profile, error } = await db.profiles.get(userId);
      
      if (error) {
        return {
          profile: null,
          eligibility: {
            canAnalyze: false,
            analysisType: 'free',
            reason: 'Errore nel recupero profilo',
            creditsRequired: 0,
            creditsAvailable: 0,
            hasFreeAnalysisAvailable: false
          },
          error: error.message
        };
      }

      const eligibility = await this.checkAnalysisEligibility(userId);
      
      return {
        profile,
        eligibility
      };

    } catch (error) {
      console.error('Errore nel recupero stato utente:', error);
      return {
        profile: null,
        eligibility: {
          canAnalyze: false,
          analysisType: 'free',
          reason: 'Errore interno',
          creditsRequired: 0,
          creditsAvailable: 0,
          hasFreeAnalysisAvailable: false
        },
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }
}

export const creditService = new CreditService();
export default creditService;