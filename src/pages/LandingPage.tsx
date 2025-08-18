import React from 'react';
import { Link } from 'react-router-dom';
// Import granulari per evitare bundle eccessivi nel critical path
import { CheckCircleIcon, StarIcon, ArrowRightIcon, DocumentTextIcon, ChartBarIcon, ShieldCheckIcon, CreditCardIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Logo from '../components/ui/Logo';
import { formatPrice } from '../utils/formatters';

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: <DocumentTextIcon className="h-8 w-8" />,
      title: 'Analisi CV Completa',
      description: 'Analisi dettagliata del tuo CV con suggerimenti personalizzati per migliorare le tue possibilità di successo.',
    },
    {
      icon: <ChartBarIcon className="h-8 w-8" />,
      title: 'Punteggi ATS',
      description: 'Verifica la compatibilità del tuo CV con i sistemi ATS utilizzati dalle aziende moderne.',
    },
    {
      icon: <ShieldCheckIcon className="h-8 w-8" />,
      title: 'Sicurezza Garantita',
      description: 'I tuoi dati sono protetti con crittografia avanzata e non vengono mai condivisi con terze parti.',
    },
    {
      icon: <ClockIcon className="h-8 w-8" />,
      title: 'Risultati Istantanei',
      description: 'Ottieni feedback immediato sul tuo CV con analisi powered by AI in pochi secondi.',
    },
  ];

  const testimonials = [
    {
      name: 'Marco Rossi',
      role: 'Software Developer',
      content: 'Grazie a questa piattaforma ho migliorato il mio CV e trovato lavoro in meno di un mese!',
      rating: 5,
    },
    {
      name: 'Laura Bianchi',
      role: 'Marketing Manager',
      content: 'L\'analisi dettagliata mi ha aiutato a capire cosa cercano i recruiter. Consigliatissimo!',
      rating: 5,
    },
    {
      name: 'Giuseppe Verdi',
      role: 'Data Analyst',
      content: 'Interfaccia intuitiva e suggerimenti molto utili. Il mio CV ora è molto più professionale.',
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Analisi Gratuita',
      price: 0,
      description: 'Perfetta per iniziare',
      features: [
        'Analisi ATS di base',
        '1 suggerimento critico',
        '1 punto di forza',
        'Supporto email',
      ],
      cta: 'Inizia Gratis',
      popular: false,
    },
    {
      name: 'Analisi Completa',
      price: 5,
      description: 'Per professionisti seri',
      features: [
        'Analisi completa del CV',
        'Punteggi dettagliati',
        'Suggerimenti illimitati',
        'Confronto con job description',
        'Supporto prioritario',
        'Cronologia analisi',
      ],
      cta: 'Acquista Ora',
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Logo variant="resumeai" size="md" linkTo="/" />
            <div className="flex items-center space-x-4">
              <Link
                to="/pricing"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Prezzi
              </Link>
              <Link to="/login">
                <Button variant="ghost">Accedi</Button>
              </Link>
              <Link to="/register">
                <Button>Registrati</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Analizza il tuo CV con
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"> l'AI</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Analizza il tuo CV con intelligenza artificiale avanzata e ricevi suggerimenti 
              personalizzati per aumentare le tue possibilità di essere assunto.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" rightIcon={<ArrowRightIcon className="h-5 w-5" />}>
                  Inizia Gratis
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  Vedi Prezzi
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Nessuna carta di credito richiesta • Analisi gratuita inclusa
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Perché scegliere ResumeAI?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              La nostra piattaforma utilizza tecnologie all'avanguardia per analizzare 
              e migliorare il tuo CV in modo professionale.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center" hover>
                <div className="text-primary-600 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Prezzi Trasparenti
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Scegli il piano più adatto alle tue esigenze
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? 'ring-2 ring-primary-500' : ''}`}
                variant={plan.popular ? 'elevated' : 'default'}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Più Popolare
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Gratis' : formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 dark:text-gray-300">/analisi</span>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to={plan.price === 0 ? '/register' : '/pricing'}>
                    <Button
                      variant={plan.popular ? 'primary' : 'outline'}
                      fullWidth
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Cosa dicono i nostri utenti
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Migliaia di professionisti hanno già migliorato il loro CV
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="text-center" hover>
                <div className="flex justify-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto a migliorare il tuo CV?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Unisciti a migliaia di professionisti che hanno già migliorato 
            le loro possibilità di carriera con CV Analyzer Pro.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              variant="secondary"
              rightIcon={<ArrowRightIcon className="h-5 w-5" />}
            >
              Inizia Ora Gratuitamente
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">CV Analyzer Pro</span>
              </div>
              <p className="text-gray-400">
                La piattaforma AI per migliorare il tuo CV e aumentare le tue possibilità di successo.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Prodotto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/pricing" className="hover:text-white">Prezzi</Link></li>
                <li><a href="#features" className="hover:text-white">Funzionalità</a></li>
                <li><a href="#testimonials" className="hover:text-white">Recensioni</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Supporto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:support@cvanalyzer.pro" className="hover:text-white">Contattaci</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Guida</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legale</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Termini di Servizio</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CV Analyzer Pro. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;