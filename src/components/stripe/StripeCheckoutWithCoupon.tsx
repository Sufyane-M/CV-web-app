import React, { useState } from 'react';
import StripeCheckout from './StripeCheckout';

interface StripeCheckoutWithCouponProps {
  bundleId: string;
  userId: string;
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  successUrl?: string;
  cancelUrl?: string;
  showCouponInput?: boolean;
}

const StripeCheckoutWithCoupon: React.FC<StripeCheckoutWithCouponProps> = ({
  bundleId,
  userId,
  buttonText = 'Acquista Ora',
  className = '',
  onSuccess,
  onError,
  successUrl,
  cancelUrl,
  showCouponInput = true
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCouponCode(e.target.value.toUpperCase());
    setCouponError(''); // Clear error when user types
  };

  const handleError = (error: string) => {
    // Check if error is coupon-related
    if (error.toLowerCase().includes('coupon')) {
      setCouponError(error);
    }
    onError?.(error);
  };

  return (
    <div className="space-y-4">
      {showCouponInput && (
        <div className="space-y-2">
          <label htmlFor="coupon-input" className="block text-sm font-medium text-gray-700">
            Codice Coupon (opzionale)
          </label>
          <div className="relative">
            <input
              id="coupon-input"
              type="text"
              value={couponCode}
              onChange={handleCouponChange}
              placeholder="Inserisci il codice coupon"
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${couponError ? 'border-red-300' : 'border-gray-300'}
              `}
              maxLength={20}
            />
            {couponCode && (
              <button
                type="button"
                onClick={() => {
                  setCouponCode('');
                  setCouponError('');
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {couponError && (
            <p className="text-sm text-red-600">{couponError}</p>
          )}
          {couponCode && !couponError && (
            <p className="text-sm text-green-600">
              Coupon "{couponCode}" sarà applicato al checkout
            </p>
          )}
        </div>
      )}
      
      <StripeCheckout
        bundleId={bundleId}
        userId={userId}
        couponCode={couponCode || undefined}
        buttonText={buttonText}
        className={className}
        onSuccess={onSuccess}
        onError={handleError}
        successUrl={successUrl}
        cancelUrl={cancelUrl}
      />
    </div>
  );
};

export default StripeCheckoutWithCoupon;

// Hook per generare link di pagamento con coupon
export const usePaymentLink = () => {
  const generatePaymentLink = (params: {
    bundleId: string;
    userId: string;
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
  }) => {
    const baseUrl = window.location.origin;
    const searchParams = new URLSearchParams({
      bundleId: params.bundleId,
      userId: params.userId,
      ...(params.couponCode && { couponCode: params.couponCode }),
      ...(params.successUrl && { successUrl: params.successUrl }),
      ...(params.cancelUrl && { cancelUrl: params.cancelUrl })
    });
    
    return `${baseUrl}/payment/checkout?${searchParams.toString()}`;
  };

  return { generatePaymentLink };
};

// Componente per mostrare un link di pagamento copiabile
export const PaymentLinkGenerator: React.FC<{
  bundleId: string;
  userId: string;
  couponCode?: string;
}> = ({ bundleId, userId, couponCode }) => {
  const { generatePaymentLink } = usePaymentLink();
  const [copied, setCopied] = useState(false);
  
  const paymentLink = generatePaymentLink({ bundleId, userId, couponCode });
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Link di Pagamento{couponCode ? ` (con coupon ${couponCode})` : ''}
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          value={paymentLink}
          readOnly
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
        />
        <button
          onClick={copyToClipboard}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${copied 
              ? 'bg-green-600 text-white' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {copied ? 'Copiato!' : 'Copia'}
        </button>
      </div>
    </div>
  );
};