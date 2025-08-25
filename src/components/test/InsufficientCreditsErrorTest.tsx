import React, { useState } from 'react';
import InsufficientCreditsError from '../error/InsufficientCreditsError';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';

const InsufficientCreditsErrorTest: React.FC = () => {
  const [creditsAvailable, setCreditsAvailable] = useState(0);
  const [showError, setShowError] = useState(true);

  const handleRetry = () => {
    console.log('Retry clicked');
    alert('Funzione Riprova cliccata!');
  };

  const scenarios = [
    { credits: 0, label: 'Nessun credito' },
    { credits: 1, label: '1 credito disponibile' },
    { credits: 2, label: '2 crediti disponibili (sufficiente)' },
  ];

  return (
    <div className="p-8 space-y-8">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Test Componente InsufficientCreditsError
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Questo componente testa la nuova UI per l'errore di crediti insufficienti
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {scenarios.map((scenario) => (
                <Button
                  key={scenario.credits}
                  onClick={() => setCreditsAvailable(scenario.credits)}
                  variant={creditsAvailable === scenario.credits ? 'primary' : 'outline'}
                  size="sm"
                >
                  {scenario.label}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowError(!showError)}
                variant={showError ? 'primary' : 'outline'}
                size="sm"
              >
                {showError ? 'Nascondi' : 'Mostra'} Errore
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>Stato attuale:</strong> {creditsAvailable} crediti disponibili, {showError ? 'errore visibile' : 'errore nascosto'}
          </div>
        </CardContent>
      </Card>

      {showError && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Anteprima Componente:
          </h3>
          <InsufficientCreditsError
            onRetry={handleRetry}
            creditsAvailable={creditsAvailable}
            creditsRequired={2}
          />
        </div>
      )}

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Funzionalità Testate:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Design moderno con gradiente e animazioni</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Visualizzazione dinamica dei crediti disponibili</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Barra di progresso per i crediti</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Pulsante principale per acquistare crediti</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Pulsanti secondari per riprova e supporto</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Sezione informativa sui benefici</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Spiegazione del perché servono 2 crediti</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✅ Lista dei vantaggi dell'acquisto</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Miglioramenti UX Implementati:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Design:</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Gradiente accattivante rosso-arancione</li>
                <li>• Icone animate e moderne</li>
                <li>• Layout responsive e ben strutturato</li>
                <li>• Supporto tema scuro</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Funzionalità:</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Visualizzazione chiara dello stato crediti</li>
                <li>• Azioni specifiche e contestuali</li>
                <li>• Informazioni educative per l'utente</li>
                <li>• Call-to-action prominente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsufficientCreditsErrorTest;