import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  CreditCard,
  Star,
  Lock,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { redirectToPaymentLink, BUNDLES, formatPrice, type BundleId } from '../services/stripe';
// import PaymentDebugPanel from '../components/PaymentDebugPanel'; // Temporarily disabled

interface Bundle {
  id: BundleId;
  name: string;
  price: number;
  credits: number;
  popular?: boolean;
  description: string;
  features: string[];
  pricePerAnalysis: number;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  const [loading, setLoading] = useState<string | null>(null);
  
  // Define bundle packages with extended features
  const bundles: Bundle[] = [
    {
      ...BUNDLES.starter,
      popular: false,
      pricePerAnalysis: BUNDLES.starter.price / BUNDLES.starter.credits,
      features: [
        'Sblocco completo della prima analisi',
        '3 analisi complete aggiuntive',
        'Feedback critici e warning',
        'Suggerimenti personalizzati',
        'Punteggio ATS dettagliato',
        'Report esportabile PDF',
      ],
    },
    {
      ...BUNDLES.value,
      popular: true,
      pricePerAnalysis: BUNDLES.value.price / BUNDLES.value.credits,
      features: [
        'Sblocco completo della prima analisi',
        '9 analisi complete aggiuntive',
        'Feedback critici e warning',
        'Suggerimenti personalizzati avanzati',
        'Punteggio ATS dettagliato',
        'Report esportabili PDF',
        'Analisi comparativa',
        'Supporto prioritario',
      ],
    },
  ];
  
  // Handle bundle purchase
  const handlePurchaseBundle = async (bundleId: BundleId) => {
    if (!isAuthenticated) {
      showError('Devi effettuare l\'accesso per acquistare un bundle');
      navigate('/login');
      return;
    }
    
    setLoading(bundleId);
    try {
      // Redirect directly to Stripe payment link
      redirectToPaymentLink(bundleId);
    } catch (error: any) {
      console.error('Payment redirect error:', error);
      showError(
        error instanceof Error ? error.message : 'Errore durante l\'avvio del pagamento'
      );
      setLoading(null);
    }
  };
  
  // Render bundle card
  const renderBundleCard = (bundle: Bundle) => (
    <div
      key={bundle.id}
      className={`group relative rounded-2xl border-2 p-8 transition-all duration-300 ease-in-out ${
        bundle.popular
          ? 'border-primary-500 bg-primary-50/50 shadow-2xl shadow-primary-500/10 dark:border-primary-700 dark:bg-primary-900/20'
          : 'border-gray-200 hover:border-primary-400 hover:shadow-xl hover:shadow-primary-500/10 dark:border-gray-700 dark:hover:border-primary-600'
      }`}
    >
      {bundle.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
          <div className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg">
            Miglior Valore
          </div>
        </div>
      )}
      <div className="flex h-full flex-col">
        <div className="mb-4 text-center">
          <h3 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">{bundle.name}</h3>
          <p className="min-h-[3rem] text-gray-600 dark:text-gray-400">{bundle.description}</p>
        </div>

        {/* Credits Highlight */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {bundle.credits} Crediti
            </span>
          </div>
          <p className="text-center text-sm text-blue-600 dark:text-blue-400 mt-1">
            Analisi complete del tuo CV
          </p>
        </div>

        <div className="mb-8 rounded-xl bg-gray-100 p-6 text-center dark:bg-gray-800">
          <div className="mb-2">
            <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
              {formatPrice(bundle.price)}
            </span>
          </div>
          <div className="mt-2 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {formatPrice(bundle.pricePerAnalysis)} per analisi
          </div>
        </div>

        <div className="flex-grow">
          <h4 className="mb-6 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Cosa include:
          </h4>
          <ul className="space-y-4">
            {bundle.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <div className="mr-3 mt-1 flex-shrink-0">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <Button
            fullWidth
            variant={bundle.popular ? 'primary' : 'outline'}
            size="lg"
            onClick={() => handlePurchaseBundle(bundle.id)}
            loading={loading === bundle.id}
            disabled={loading !== null}
            className={`transform transition-all duration-300 group-hover:scale-105 font-bold text-lg py-4 shadow-lg ${
              bundle.popular 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-500/25 hover:shadow-blue-500/40' 
                : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 shadow-gray-500/25 hover:shadow-gray-500/40'
            }`}
          >
            {loading === bundle.id ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <span className="text-lg">Elaborazione...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center group">
                <CreditCard className="h-6 w-6 mr-3 group-hover:animate-bounce" />
                <span>Acquista Ora</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // FAQ data
  const faqs = [
    {
      question: 'Come funziona il sistema a crediti?',
      answer: 'Ogni credito ti permette di effettuare 1 analisi completa del CV. La prima analisi è sempre gratuita ma con funzionalità limitate. Acquistando un bundle, sblocchi immediatamente i risultati completi della prima analisi e ottieni crediti aggiuntivi per nuove analisi.',
      icon: HelpCircle,
    },
    {
      question: 'Cosa significa "sbloccare" la prima analisi?',
      answer: 'La prima analisi gratuita mostra solo una parte dei risultati - alcune sezioni come feedback critici e warning sono offuscate. Acquistando un bundle, accedi immediatamente a tutti i dettagli nascosti della tua prima analisi.',
      icon: Sparkles,
    },
    {
      question: 'I crediti scadono?',
      answer: 'No, i crediti acquistati non scadono mai. Puoi utilizzarli quando vuoi, senza limiti di tempo.',
      icon: Clock,
    },
    {
      question: 'Quali metodi di pagamento sono accettati?',
      answer: 'Accettiamo le principali carte di credito e debito (Visa, Mastercard, American Express) tramite il nostro partner di pagamento sicuro Stripe.',
      icon: CreditCard,
    },
    {
      question: 'La transazione è sicura?',
      answer: 'Sì, tutte le transazioni sono gestite da Stripe, leader mondiale nei pagamenti online, che garantisce i massimi standard di sicurezza e crittografia.',
      icon: ShieldCheck,
    },
    {
      question: 'Posso ottenere una fattura?',
      answer: 'Certo. Dopo ogni acquisto, riceverai automaticamente una ricevuta via email. Se hai bisogno di una fattura con dati specifici, contatta il nostro supporto.',
      icon: Info,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Scegli il Piano Perfetto per Te
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">
            Dai una svolta alla tua ricerca di lavoro. I nostri piani ti offrono gli strumenti per creare un CV che non passa inosservato,
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
          {bundles.map(renderBundleCard)}
        </div>

        {/* Sezione Garanzie */}
        <div className="mt-20 rounded-2xl bg-white p-10 shadow-lg dark:bg-gray-800">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
            La Tua Soddisfazione è la Nostra Priorità
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Pagamenti Sicuri</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Transazioni protette con crittografia SSL tramite Stripe.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Crediti Senza Scadenza</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Utilizza le tue analisi quando ne hai più bisogno, senza fretta.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Supporto Dedicato</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Il nostro team è a tua disposizione per qualsiasi domanda.
              </p>
            </div>
          </div>
        </div>

        {/* Sezione FAQ */}
        <div className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Domande Frequenti
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Trova qui le risposte alle domande più comuni.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <dt className="text-lg font-semibold text-gray-900 dark:text-white">
                    <div className="flex items-start">
                      <faq.icon className="mr-4 h-6 w-6 flex-shrink-0 text-primary-500" />
                      <span>{faq.question}</span>
                    </div>
                  </dt>
                  <dd className="mt-3 text-gray-600 dark:text-gray-400">{faq.answer}</dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;