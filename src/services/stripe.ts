import { loadStripe, Stripe } from '@stripe/stripe-js';

// Lazy init Stripe to keep it out of the initial critical path
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Bundle configurations
export const BUNDLES = {
  starter: {
    id: 'starter',
    name: 'Pacchetto Base',
    price: 4.99,
    credits: 4,
    currency: 'EUR',
    description: 'Ideale per chi vuole testare il nostro servizio',
    paymentLink: 'https://buy.stripe.com/aFabJ0cEc1un5E8aZY0Ba06'
  },
  value: {
    id: 'value',
    name: 'Pacchetto Premium',
    price: 9.99,
    credits: 10,
    currency: 'EUR',
    description: 'La scelta migliore per chi cerca il massimo valore',
    paymentLink: 'https://buy.stripe.com/00wbJ00Vu0qj4A45FE0Ba05'
  }
} as const;

export type BundleId = keyof typeof BUNDLES;

// Create checkout session - now redirects directly to Stripe payment links
export const createCheckoutSession = async (bundleId: BundleId, userId: string) => {
  try {
    const bundle = BUNDLES[bundleId];
    if (!bundle) {
      throw new Error('Invalid bundle selected');
    }

    // Store user info in sessionStorage for post-payment processing
    sessionStorage.setItem('pendingPayment', JSON.stringify({
      bundleId,
      userId,
      timestamp: Date.now()
    }));

    // Redirect directly to Stripe payment link
    window.location.href = bundle.paymentLink;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

// Verify payment session - updated for payment links
export const verifyPaymentSession = async (sessionId: string) => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    
    // Get pending payment info from sessionStorage
    const pendingPaymentStr = sessionStorage.getItem('pendingPayment');
    let pendingPayment = null;
    
    if (pendingPaymentStr) {
      try {
        pendingPayment = JSON.parse(pendingPaymentStr);
      } catch (error) {
        console.error('Error parsing pending payment:', error);
      }
    }
    
    const response = await fetch(`${apiBaseUrl}/payment-links/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        sessionId,
        pendingPayment 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify payment session');
    }

    // Clear pending payment from sessionStorage after successful verification
    sessionStorage.removeItem('pendingPayment');
    
    return await response.json();
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

// Format price for display
export const formatPrice = (price: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(price);
};

export default stripePromise;