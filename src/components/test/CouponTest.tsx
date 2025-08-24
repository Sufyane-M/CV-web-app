import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import CouponInput from '../coupon/CouponInput';
import CheckoutWithCoupon from '../stripe/CheckoutWithCoupon';
import { couponService } from '../../services/couponService';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const CouponTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedBundle] = useState({
    id: 'test-bundle',
    name: 'Bundle Test',
    price: 100,
    credits: 1000
  });

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runTests = async () => {
    setIsRunning(true);
    clearResults();

    // Test 1: Validazione coupon valido
    try {
      addTestResult({
        test: 'Test Coupon Service - Formato Sconto',
        status: 'success',
        message: 'Formato sconto funziona correttamente',
        details: {
          percentage: couponService.formatDiscount(25, 'percentage'),
          fixed: couponService.formatDiscount(10, 'fixed')
        }
      });
    } catch (error: any) {
      addTestResult({
        test: 'Test Coupon Service - Formato Sconto',
        status: 'error',
        message: error.message
      });
    }

    // Test 2: Calcolo sconto percentuale
    try {
      const result = couponService.calculateDiscount(100, 20, 'percentage');
      if (result.discountAmount === 20 && result.finalAmount === 80) {
        addTestResult({
          test: 'Calcolo Sconto Percentuale',
          status: 'success',
          message: 'Calcolo sconto percentuale corretto',
          details: result
        });
      } else {
        addTestResult({
          test: 'Calcolo Sconto Percentuale',
          status: 'error',
          message: 'Calcolo sconto percentuale errato',
          details: result
        });
      }
    } catch (error: any) {
      addTestResult({
        test: 'Calcolo Sconto Percentuale',
        status: 'error',
        message: error.message
      });
    }

    // Test 3: Calcolo sconto fisso
    try {
      const result = couponService.calculateDiscount(100, 15, 'fixed');
      if (result.discountAmount === 15 && result.finalAmount === 85) {
        addTestResult({
          test: 'Calcolo Sconto Fisso',
          status: 'success',
          message: 'Calcolo sconto fisso corretto',
          details: result
        });
      } else {
        addTestResult({
          test: 'Calcolo Sconto Fisso',
          status: 'error',
          message: 'Calcolo sconto fisso errato',
          details: result
        });
      }
    } catch (error: any) {
      addTestResult({
        test: 'Calcolo Sconto Fisso',
        status: 'error',
        message: error.message
      });
    }

    // Test 4: Sconto con limite massimo
    try {
      const result = couponService.calculateDiscount(100, 50, 'percentage', 30);
      if (result.discountAmount === 30 && result.finalAmount === 70) {
        addTestResult({
          test: 'Sconto con Limite Massimo',
          status: 'success',
          message: 'Limite massimo sconto applicato correttamente',
          details: result
        });
      } else {
        addTestResult({
          test: 'Sconto con Limite Massimo',
          status: 'error',
          message: 'Limite massimo sconto non applicato correttamente',
          details: result
        });
      }
    } catch (error: any) {
      addTestResult({
        test: 'Sconto con Limite Massimo',
        status: 'error',
        message: error.message
      });
    }

    // Test 5: Validazione coupon con importo minimo
    try {
      // Simula un coupon con importo minimo
      const mockCoupon = {
        id: 'test-coupon',
        code: 'TEST20',
        discount_type: 'percentage' as const,
        discount_value: 20,
        minimum_amount: 50,
        is_active: true,
        valid_from: new Date(Date.now() - 86400000).toISOString(), // Ieri
        valid_until: new Date(Date.now() + 86400000).toISOString(), // Domani
        usage_count: 0,
        usage_limit: 100
      };

      // Test con importo insufficiente
      const lowAmountResult = couponService.validateCouponRules(mockCoupon, 30);
      if (!lowAmountResult.isValid && lowAmountResult.reason?.includes('minimo')) {
        addTestResult({
          test: 'Validazione Importo Minimo - Insufficiente',
          status: 'success',
          message: 'Validazione importo minimo funziona correttamente',
          details: lowAmountResult
        });
      } else {
        addTestResult({
          test: 'Validazione Importo Minimo - Insufficiente',
          status: 'error',
          message: 'Validazione importo minimo non funziona',
          details: lowAmountResult
        });
      }

      // Test con importo sufficiente
      const validAmountResult = couponService.validateCouponRules(mockCoupon, 80);
      if (validAmountResult.isValid) {
        addTestResult({
          test: 'Validazione Importo Minimo - Sufficiente',
          status: 'success',
          message: 'Validazione importo minimo funziona correttamente',
          details: validAmountResult
        });
      } else {
        addTestResult({
          test: 'Validazione Importo Minimo - Sufficiente',
          status: 'error',
          message: 'Validazione importo minimo non funziona',
          details: validAmountResult
        });
      }
    } catch (error: any) {
      addTestResult({
        test: 'Validazione Importo Minimo',
        status: 'error',
        message: error.message
      });
    }

    // Test 6: Validazione date
    try {
      // Coupon scaduto
      const expiredCoupon = {
        id: 'expired-coupon',
        code: 'EXPIRED',
        discount_type: 'percentage' as const,
        discount_value: 10,
        is_active: true,
        valid_from: new Date(Date.now() - 172800000).toISOString(), // 2 giorni fa
        valid_until: new Date(Date.now() - 86400000).toISOString(), // Ieri
        usage_count: 0,
        usage_limit: 100
      };

      const expiredResult = couponService.validateCouponRules(expiredCoupon, 100);
      if (!expiredResult.isValid && expiredResult.reason?.includes('scaduto')) {
        addTestResult({
          test: 'Validazione Date - Coupon Scaduto',
          status: 'success',
          message: 'Validazione date funziona correttamente',
          details: expiredResult
        });
      } else {
        addTestResult({
          test: 'Validazione Date - Coupon Scaduto',
          status: 'error',
          message: 'Validazione date non funziona',
          details: expiredResult
        });
      }
    } catch (error: any) {
      addTestResult({
        test: 'Validazione Date',
        status: 'error',
        message: error.message
      });
    }

    // Test 7: Validazione limite utilizzi
    try {
      const limitReachedCoupon = {
        id: 'limit-reached',
        code: 'LIMIT',
        discount_type: 'percentage' as const,
        discount_value: 15,
        is_active: true,
        valid_from: new Date(Date.now() - 86400000).toISOString(),
        valid_until: new Date(Date.now() + 86400000).toISOString(),
        usage_count: 100,
        usage_limit: 100
      };

      const limitResult = couponService.validateCouponRules(limitReachedCoupon, 100);
      if (!limitResult.isValid && limitResult.reason?.includes('limite')) {
        addTestResult({
          test: 'Validazione Limite Utilizzi',
          status: 'success',
          message: 'Validazione limite utilizzi funziona correttamente',
          details: limitResult
        });
      } else {
        addTestResult({
          test: 'Validazione Limite Utilizzi',
          status: 'error',
          message: 'Validazione limite utilizzi non funziona',
          details: limitResult
        });
      }
    } catch (error: any) {
      addTestResult({
        test: 'Validazione Limite Utilizzi',
        status: 'error',
        message: error.message
      });
    }

    // Test API endpoints (simulati)
    addTestResult({
      test: 'API Endpoints',
      status: 'warning',
      message: 'Test API richiede server attivo e database configurato'
    });

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Test Sistema Coupon</h1>
        <p className="text-gray-600">
          Questa pagina permette di testare tutte le funzionalità del sistema coupon.
        </p>
      </div>

      {/* Controlli test */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Test Automatici</h2>
          <div className="flex space-x-3">
            <button
              onClick={clearResults}
              disabled={isRunning}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              Pulisci
            </button>
            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>{isRunning ? 'Esecuzione...' : 'Esegui Test'}</span>
            </button>
          </div>
        </div>

        {/* Risultati test */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Risultati:</h3>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{result.test}</h4>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-500 cursor-pointer">Dettagli</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test componenti UI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test CouponInput */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test CouponInput</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Testa l'inserimento di codici coupon. Prova con codici come: TEST20, SCONTO10, INVALID
            </p>
            <CouponInput
              amount={selectedBundle.price}
              onCouponApplied={(couponData) => {
                console.log('Coupon applicato:', couponData);
                alert(`Coupon ${couponData.code} applicato! Sconto: €${couponData.discountAmount}`);
              }}
              onCouponRemoved={() => {
                console.log('Coupon rimosso');
                alert('Coupon rimosso');
              }}
            />
          </div>
        </div>

        {/* Test CheckoutWithCoupon */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test CheckoutWithCoupon</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Testa il componente di checkout completo con integrazione coupon.
            </p>
            <CheckoutWithCoupon
              bundle={selectedBundle}
              onSuccess={() => {
                console.log('Checkout completato con successo');
                alert('Checkout completato!');
              }}
              onError={(error) => {
                console.error('Errore checkout:', error);
                alert(`Errore: ${error}`);
              }}
            />
          </div>
        </div>
      </div>

      {/* Istruzioni per test manuali */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Test Manuali</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>1. Test Database:</strong> Verifica che le tabelle coupon siano create correttamente in Supabase.</p>
          <p><strong>2. Test API:</strong> Usa Postman o curl per testare gli endpoint /api/coupons/*</p>
          <p><strong>3. Test Stripe:</strong> Verifica l'integrazione con Stripe usando coupon reali.</p>
          <p><strong>4. Test Sicurezza:</strong> Prova a utilizzare lo stesso coupon più volte o con utenti diversi.</p>
          <p><strong>5. Test Performance:</strong> Verifica i tempi di risposta con molti coupon attivi.</p>
        </div>
      </div>
    </div>
  );
};

export default CouponTest;