import React, { useState } from 'react';
import { AlertCircle, Check, Loader2, Tag } from 'lucide-react';
import { couponService } from '../../services/couponService';

interface CouponInputProps {
  amount: number;
  onCouponApplied: (couponData: {
    code: string;
    discountAmount: number;
    finalAmount: number;
    coupon: any;
  }) => void;
  onCouponRemoved: () => void;
  disabled?: boolean;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null;
}

const CouponInput: React.FC<CouponInputProps> = ({
  amount,
  onCouponApplied,
  onCouponRemoved,
  disabled = false,
  appliedCoupon = null
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Inserisci un codice coupon');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await couponService.validateCoupon(couponCode.trim(), amount);
      
      if (result.isValid) {
        onCouponApplied({
          code: result.coupon.code,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
          coupon: result.coupon
        });
        setShowInput(false);
        setCouponCode('');
      } else {
        setError('Coupon non valido o scaduto');
      }
    } catch (err: any) {
      console.error('Errore nella validazione del coupon:', err);
      setError(err.message || 'Errore nella validazione del coupon');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    setCouponCode('');
    setError(null);
    setShowInput(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidateCoupon();
    }
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Coupon applicato: {appliedCoupon.code}
              </p>
              <p className="text-sm text-green-600">
                Sconto: {couponService.formatDiscount(appliedCoupon.discountAmount)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveCoupon}
            disabled={disabled}
            className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
          >
            Rimuovi
          </button>
        </div>
      </div>
    );
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        disabled={disabled}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 disabled:opacity-50 text-sm font-medium"
      >
        <Tag className="h-4 w-4" />
        <span>Hai un codice coupon?</span>
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Codice Coupon</span>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Inserisci il codice coupon"
              disabled={disabled || isValidating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
          </div>
          <button
            onClick={handleValidateCoupon}
            disabled={disabled || isValidating || !couponCode.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1 text-sm font-medium"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifica...</span>
              </>
            ) : (
              <span>Applica</span>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={() => {
            setShowInput(false);
            setCouponCode('');
            setError(null);
          }}
          disabled={disabled || isValidating}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Annulla
        </button>
      </div>
    </div>
  );
};

export default CouponInput;