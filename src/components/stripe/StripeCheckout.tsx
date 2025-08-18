import React, { useState } from 'react';

interface StripeCheckoutProps {
  priceId?: string;
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId = 'price_xxx',
  buttonText = 'Acquista Ora',
  className = '',
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);

  const createCheckoutSession = async () => {
    setLoading(true);
    
    try {
      // Chiamata POST all'API di Vercel
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId, // Opzionale: puoi passare dati aggiuntivi se necessario
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della sessione');
      }

      const { url } = await response.json();
      
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
      alert(`Errore: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={createCheckoutSession}
      disabled={loading}
      className={`
        px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
        hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      {loading ? 'Caricamento...' : buttonText}
    </button>
  );
};

export default StripeCheckout;

// Hook personalizzato per l'uso in altri componenti
export const useStripeCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = async (options?: { priceId?: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: options?.priceId || 'price_xxx',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della sessione');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
        return { success: true, url };
      } else {
        throw new Error('URL della sessione non ricevuto');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    createCheckoutSession,
    loading,
    error,
  };
};

// Esempio di utilizzo del componente
export const ExampleUsage: React.FC = () => {
  const handleSuccess = () => {
    console.log('Redirect a Stripe Checkout avviato');
  };

  const handleError = (error: string) => {
    console.error('Errore checkout:', error);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Esempio Stripe Checkout</h2>
      
      {/* Utilizzo del componente */}
      <StripeCheckout
        priceId="price_xxx"
        buttonText="Acquista Premium"
        onSuccess={handleSuccess}
        onError={handleError}
        className="mb-4"
      />
      
      {/* Utilizzo dell'hook */}
      <CheckoutWithHook />
    </div>
  );
};

// Esempio con hook
const CheckoutWithHook: React.FC = () => {
  const { createCheckoutSession, loading, error } = useStripeCheckout();

  const handleClick = async () => {
    const result = await createCheckoutSession({ priceId: 'price_xxx' });
    if (!result.success) {
      alert(`Errore: ${result.error}`);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Caricamento...' : 'Checkout con Hook'}
      </button>
      {error && (
        <p className="text-red-600 mt-2">Errore: {error}</p>
      )}
    </div>
  );
};