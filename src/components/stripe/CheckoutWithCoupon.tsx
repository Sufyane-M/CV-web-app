import React, { useState } from 'react';
import { CreditCard, Calculator } from 'lucide-react';
import CouponInput from '../coupon/CouponInput';
import { couponService } from '../../services/couponService';

interface CheckoutWithCouponProps {
  bundle: {
    id: string;
    name: string;
    price: number;
    credits: number;
    stripePriceId?: string;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

const CheckoutWithCoupon: React.FC<CheckoutWithCouponProps> = ({
  bundle,
  onSuccess,
  onError,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    coupon: any;
  } | null>(null);

  const originalAmount = bundle.price;
  const finalAmount = appliedCoupon ? appliedCoupon.finalAmount : originalAmount;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  const createCheckoutSession = async () => {
    setLoading(true);
    
    try {
      const requestBody: any = {
        bundleId: bundle.id,
        bundleName: bundle.name,
        credits: bundle.credits,
        amount: originalAmount
      };

      // Aggiungi il coupon se applicato
      if (appliedCoupon) {
        requestBody.couponCode = appliedCoupon.code;
      }

      // Se c'è un stripePriceId, usalo
      if (bundle.stripePriceId) {
        requestBody.stripePriceId = bundle.stripePriceId;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della sessione');
      }

      const { url, couponApplied } = await response.json();
      
      // Redirect a Stripe Checkout
      if (url) {
        window.location.href = url;
        onSuccess?.();
      } else {
        throw new Error('URL della sessione non ricevuto');
      }
      
    } catch (error) {
      console.error('Errore checkout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCouponApplied = (couponData: {
    code: string;
    discountAmount: number;
    finalAmount: number;
    coupon: any;
  }) => {
    setAppliedCoupon(couponData);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto ${className}`}>
      {/* Header del bundle */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{bundle.name}</h3>
        <p className="text-gray-600">{bundle.credits} crediti</p>
      </div>

      {/* Riepilogo prezzi */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Prezzo originale:</span>
          <span className="font-medium">{couponService.formatDiscount(originalAmount)}</span>
        </div>
        
        {appliedCoupon && (
          <>
            <div className="flex items-center justify-between mb-2 text-green-600">
              <span>Sconto ({appliedCoupon.code}):</span>
              <span>-{couponService.formatDiscount(discountAmount)}</span>
            </div>
            <hr className="my-2" />
          </>
        )}
        
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Totale:</span>
          <span className={appliedCoupon ? 'text-green-600' : 'text-gray-900'}>
            {couponService.formatDiscount(finalAmount)}
          </span>
        </div>
        
        {appliedCoupon && (
          <div className="text-sm text-green-600 mt-1">
            Risparmi {couponService.formatDiscount(discountAmount)}!
          </div>
        )}
      </div>

      {/* Input coupon */}
      <div className="mb-6">
        <CouponInput
          amount={originalAmount}
          onCouponApplied={handleCouponApplied}
          onCouponRemoved={handleCouponRemoved}
          appliedCoupon={appliedCoupon}
          disabled={loading}
        />
      </div>

      {/* Pulsante checkout */}
      <button
        onClick={createCheckoutSession}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Elaborazione...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>Procedi al pagamento</span>
          </>
        )}
      </button>

      {/* Informazioni aggiuntive */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Pagamento sicuro tramite Stripe</p>
        <p>I crediti verranno aggiunti automaticamente al tuo account</p>
      </div>
    </div>
  );
};

export default CheckoutWithCoupon;