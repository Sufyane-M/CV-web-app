import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StripeCheckoutWithCoupon from '../components/stripe/StripeCheckoutWithCoupon';

// Bundle configurations (must match backend)
const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio'
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore'
  }
};

const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract parameters from URL
  const bundleId = searchParams.get('bundleId');
  const userId = searchParams.get('userId');
  const couponCode = searchParams.get('couponCode');
  const successUrl = searchParams.get('successUrl');
  const cancelUrl = searchParams.get('cancelUrl');

  useEffect(() => {
    // Validate required parameters
    if (!bundleId || !userId) {
      setError('Parametri mancanti: bundleId e userId sono richiesti');
    } else if (!BUNDLES[bundleId as keyof typeof BUNDLES]) {
      setError('Bundle ID non valido');
    } else {
      setError('');
    }
    setLoading(false);
  }, [bundleId, userId]);

  const handleSuccess = () => {
    console.log('Payment successful!');
  };

  const handleError = (error: string) => {
    console.error('Payment error:', error);
    setError(error);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error && (!bundleId || !userId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Errore</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Torna Indietro
          </button>
        </div>
      </div>
    );
  }

  const bundle = BUNDLES[bundleId as keyof typeof BUNDLES];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Checkout</h1>
            <p className="text-blue-100">Completa il tuo acquisto</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Bundle Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dettagli Prodotto</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{bundle.name}</h3>
                  <span className="text-xl font-bold text-blue-600">
                    €{bundle.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{bundle.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {bundle.credits} crediti inclusi
                  </span>
                </div>
              </div>
            </div>

            {/* Coupon Information */}
            {couponCode && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-green-500 text-xl mr-2">🎟️</span>
                    <div>
                      <p className="text-green-800 font-medium">
                        Coupon applicato: {couponCode}
                      </p>
                      <p className="text-green-600 text-sm">
                        Lo sconto sarà calcolato al momento del pagamento
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Checkout Component */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Pagamento</h2>
              <StripeCheckoutWithCoupon
                bundleId={bundleId!}
                userId={userId!}
                couponCode={couponCode || undefined}
                buttonText="Procedi al Pagamento"
                className="w-full py-4 text-lg"
                onSuccess={handleSuccess}
                onError={handleError}
                successUrl={successUrl || undefined}
                cancelUrl={cancelUrl || undefined}
                showCouponInput={!couponCode} // Hide coupon input if already provided in URL
              />
            </div>

            {/* Security Notice */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">🔒</span>
                <span>Pagamento sicuro tramite Stripe (Carte di credito e PayPal)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoBack}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Torna Indietro
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;