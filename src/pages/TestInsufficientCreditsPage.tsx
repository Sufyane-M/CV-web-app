import React from 'react';
import InsufficientCreditsError from '../components/error/InsufficientCreditsError';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';

const TestInsufficientCreditsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    console.log('Retry button clicked');
    // Simula un retry
    alert('Funzione di retry chiamata!');
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={goBack} variant="outline" className="mb-4">
            ← Torna Indietro
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Test Componente Errore Crediti Insufficienti
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Questa pagina dimostra il nuovo componente per gestire gli errori di crediti insufficienti.
          </p>
        </div>

        {/* Esempi di utilizzo */}
        <div className="space-y-12">
          {/* Esempio 1: Utente con 0 crediti */}
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Scenario 1: Utente con 0 crediti
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Simula un utente che ha esaurito tutti i crediti e tenta di fare un'analisi.
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <code className="text-sm">
                    creditsRequired: 2, creditsAvailable: 0
                  </code>
                </div>
              </CardContent>
            </Card>
            <InsufficientCreditsError
              onRetry={handleRetry}
              creditsRequired={2}
              creditsAvailable={0}
              errorCode="INSUFFICIENT_CREDITS_001"
            />
          </div>

          {/* Esempio 2: Utente con 1 credito (insufficiente) */}
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Scenario 2: Utente con 1 credito (insufficiente)
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Simula un utente che ha solo 1 credito ma ne servono 2 per l'analisi.
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <code className="text-sm">
                    creditsRequired: 2, creditsAvailable: 1
                  </code>
                </div>
              </CardContent>
            </Card>
            <InsufficientCreditsError
              onRetry={handleRetry}
              creditsRequired={2}
              creditsAvailable={1}
              errorCode="INSUFFICIENT_CREDITS_002"
            />
          </div>

          {/* Esempio 3: Senza bottone retry */}
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Scenario 3: Senza bottone retry
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Versione senza il bottone "Riprova" per contesti dove non è applicabile.
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <code className="text-sm">
                    onRetry: undefined, creditsRequired: 2, creditsAvailable: 0
                  </code>
                </div>
              </CardContent>
            </Card>
            <InsufficientCreditsError
              creditsRequired={2}
              creditsAvailable={0}
              errorCode="INSUFFICIENT_CREDITS_003"
            />
          </div>
        </div>

        {/* Note tecniche */}
        <Card className="mt-12">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Note Tecniche
            </h2>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Caratteristiche implementate:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Icona di avviso con design accattivante (triangolo giallo con punto esclamativo)</li>
                  <li>Messaggio principale chiaro e sottotitolo informativo</li>
                  <li>Visualizzazione del saldo crediti corrente</li>
                  <li>Spiegazione empatica del problema</li>
                  <li>Bottone primario "Acquista Crediti" con design gradient</li>
                  <li>Bottone secondario "Riprova" (opzionale)</li>
                  <li>Link "Contatta il supporto" con apertura email</li>
                  <li>Sezione tecnica collassabile con dettagli dell'errore</li>
                  <li>Design responsive e supporto dark mode</li>
                  <li>Animazioni e transizioni fluide</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Integrazione:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Integrato nel componente ErrorFallback esistente</li>
                  <li>Rilevamento automatico degli errori di crediti insufficienti</li>
                  <li>Passa automaticamente i parametri necessari (crediti richiesti, disponibili, codice errore)</li>
                  <li>Navigazione diretta alla pagina pricing per l'acquisto crediti</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestInsufficientCreditsPage;