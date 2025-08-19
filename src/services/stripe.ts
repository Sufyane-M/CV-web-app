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

// Direct payment redirect using Stripe payment links
export const redirectToPaymentLink = (bundleId: BundleId) => {
  const bundle = BUNDLES[bundleId];
  if (!bundle || !bundle.paymentLink) {
    throw new Error('Invalid bundle or payment link not available');
  }
  
  // Redirect to the Stripe payment link
  window.location.href = bundle.paymentLink;
};

// Create checkout session (legacy method - kept for backward compatibility)
export const createCheckoutSession = async (bundleId: BundleId, userId: string) => {
  try {
    const bundle = BUNDLES[bundleId];
    if (!bundle) {
      throw new Error('Invalid bundle selected');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiBaseUrl}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bundleId,
        userId,
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

// Verify payment session
export const verifyPaymentSession = async (sessionId: string) => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiBaseUrl}/stripe/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify payment session');
    }

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