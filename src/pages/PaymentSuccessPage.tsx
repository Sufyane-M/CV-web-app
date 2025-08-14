import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { verifyPaymentSession } from '../services/stripe';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

interface PaymentStatus {
  loading: boolean;
  success: boolean;
  error: string | null;
  credits?: number;
  planName?: string;
}

const PaymentSuccessPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifyPayment = async () => {
      const searchParams = new URLSearchParams(location.search);
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        showError('Invalid payment session');
        navigate('/pricing');
        return;
      }

      if (!user) {
        showError('Please log in to verify payment');
        navigate('/login');
        return;
      }

      try {
        const result = await verifyPaymentSession(sessionId);
        setPaymentDetails(result);
        setVerified(true);
        showSuccess('Payment verified successfully! Credits have been added to your account.');
      } catch (error) {
        console.error('Payment verification error:', error);
        showError(
          error instanceof Error ? error.message : 'Failed to verify payment. Please contact support.'
        );
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [user?.id, location.search]);
  
  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleRetry = () => {
    navigate('/pricing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Verifica del pagamento in corso...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Stiamo verificando il tuo pagamento. Attendere prego.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <Card className="p-8 text-center">
          {verified ? (
            <>
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Thank you for your purchase. Your credits have been added to your account.
              </p>
              
              {paymentDetails && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p className="font-semibold">{paymentDetails.planName}</p>
                    <p>+{paymentDetails.credits} credits added</p>
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleContinue}
                className="w-full"
              >
                Continue to Dashboard
              </Button>
            </>
          ) : (
            <>
              <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                There was an issue verifying your payment. Please try again or contact support.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleContinue}
                  variant="outline"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;