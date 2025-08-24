import React, { useState, useEffect } from 'react';
import { CouponInput } from '../coupon/CouponInput';
import { CheckoutWithCoupon } from '../stripe/CheckoutWithCoupon';
import { CouponManagement } from '../admin/CouponManagement';
import { CouponSecurityDashboard } from '../admin/CouponSecurityDashboard';
import { couponService } from '../../services/couponService';

interface TestBundle {
  id: string;
  name: string;
  price: number;
  credits: number;
  stripePriceId?: string;
}

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

const CouponIntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<TestBundle | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  // Bundle di test
  const testBundles: TestBundle[] = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 1000, // €10.00
      credits: 10,
      stripePriceId: 'price_test_basic'
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      price: 2500, // €25.00
      credits: 30,
      stripePriceId: 'price_test_premium'
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: 5000, // €50.00
      credits: 100,
      stripePriceId: 'price_test_enterprise'
    }
  ];

  const addTestResult = (test: string, status: 'success' | 'error' | 'pending', message: string, details?: any) => {
    setTestResults(prev => [
      ...prev.filter(r => r.test !== test),
      { test, status, message, details }
    ]);
  };

  const runCouponServiceTests = async () => {
    addTestResult('coupon-service', 'pending', 'Testing coupon service functions...');
    
    try {
      // Test 1: Formato sconto
      const percentFormat = couponService.formatDiscount(20, 'percentage');
      const fixedFormat = couponService.formatDiscount(500, 'fixed');
      
      if (percentFormat !== '20%' || fixedFormat !== '€5.00') {
        throw new Error(`Format test failed: ${percentFormat}, ${fixedFormat}`);
      }

      // Test 2: Calcolo sconto percentuale
      const percentDiscount = couponService.calculateDiscount(1000, {
        discount_type: 'percentage',
        discount_value: 20,
        max_discount_amount: null,
        minimum_amount: 500
      });
      
      if (percentDiscount.discountAmount !== 200 || percentDiscount.finalAmount !== 800) {
        throw new Error(`Percentage discount calculation failed`);
      }

      // Test 3: Calcolo sconto fisso
      const fixedDiscount = couponService.calculateDiscount(1000, {
        discount_type: 'fixed',
        discount_value: 300,
        max_discount_amount: null,
        minimum_amount: 500
      });
      
      if (fixedDiscount.discountAmount !== 300 || fixedDiscount.finalAmount !== 700) {
        throw new Error(`Fixed discount calculation failed`);
      }

      // Test 4: Limite massimo sconto
      const limitedDiscount = couponService.calculateDiscount(1000, {
        discount_type: 'percentage',
        discount_value: 50,
        max_discount_amount: 300,
        minimum_amount: 500
      });
      
      if (limitedDiscount.discountAmount !== 300) {
        throw new Error(`Max discount limit test failed`);
      }

      // Test 5: Importo minimo
      const belowMinimum = couponService.calculateDiscount(400, {
        discount_type: 'percentage',
        discount_value: 20,
        max_discount_amount: null,
        minimum_amount: 500
      });
      
      if (belowMinimum.discountAmount !== 0) {
        throw new Error(`Minimum amount test failed`);
      }

      addTestResult('coupon-service', 'success', 'All coupon service tests passed', {
        percentFormat,
        fixedFormat,
        percentDiscount,
        fixedDiscount,
        limitedDiscount,
        belowMinimum
      });
    } catch (error) {
      addTestResult('coupon-service', 'error', `Coupon service test failed: ${error.message}`, error);
    }
  };

  const testCouponValidation = async () => {
    addTestResult('coupon-validation', 'pending', 'Testing coupon validation API...');
    
    try {
      // Test con codice inesistente
      const invalidResponse = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          couponCode: 'INVALID_CODE_TEST',
          amount: 1000
        })
      });
      
      if (invalidResponse.ok) {
        throw new Error('Invalid coupon should not validate');
      }

      // Test con codice valido (se esiste)
      const validResponse = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          couponCode: 'TEST20',
          amount: 1000
        })
      });
      
      const validData = await validResponse.json();
      
      addTestResult('coupon-validation', 'success', 'Coupon validation API working', {
        invalidTest: 'Failed as expected',
        validTest: validData
      });
    } catch (error) {
      addTestResult('coupon-validation', 'error', `Coupon validation test failed: ${error.message}`, error);
    }
  };

  const testSecurityFeatures = async () => {
    addTestResult('security-features', 'pending', 'Testing security features...');
    
    try {
      // Test rate limiting (multiple requests)
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              couponCode: `RATE_LIMIT_TEST_${i}`,
              amount: 1000
            })
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (!rateLimited) {
        console.warn('Rate limiting might not be working properly');
      }

      // Test security logs endpoint (requires admin)
      const securityResponse = await fetch('/api/coupons/admin/security-logs');
      
      addTestResult('security-features', 'success', 'Security features tested', {
        rateLimitingDetected: rateLimited,
        securityEndpointStatus: securityResponse.status
      });
    } catch (error) {
      addTestResult('security-features', 'error', `Security test failed: ${error.message}`, error);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      await runCouponServiceTests();
      await testCouponValidation();
      await testSecurityFeatures();
    } finally {
      setIsRunning(false);
    }
  };

  const handleCouponApplied = (coupon: any) => {
    setAppliedCoupon(coupon);
    addTestResult('coupon-ui', 'success', `Coupon ${coupon.code} applied successfully`, coupon);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    addTestResult('coupon-ui', 'success', 'Coupon removed successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🧪 Test Integrazione Sistema Coupon
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? '🔄 Testing...' : '🚀 Run All Tests'}
          </button>
          
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            {showAdmin ? '👁️ Hide Admin' : '⚙️ Show Admin Panel'}
          </button>
          
          <button
            onClick={() => setShowSecurity(!showSecurity)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            {showSecurity ? '👁️ Hide Security' : '🛡️ Show Security Dashboard'}
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">📊 Test Results</h3>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded border">
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{result.test}</span>
                      <span className={`text-sm ${getStatusColor(result.status)}`}>
                        {result.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">Show Details</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bundle Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🛒 Test Checkout with Coupons</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {testBundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedBundle?.id === bundle.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedBundle(bundle)}
            >
              <h3 className="font-semibold text-lg">{bundle.name}</h3>
              <p className="text-gray-600">€{(bundle.price / 100).toFixed(2)}</p>
              <p className="text-sm text-gray-500">{bundle.credits} credits</p>
            </div>
          ))}
        </div>

        {selectedBundle && (
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">🎫 Test Coupon Input</h3>
              <CouponInput
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
                cartAmount={selectedBundle.price}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">💳 Test Checkout</h3>
              <CheckoutWithCoupon
                bundle={selectedBundle}
                appliedCoupon={appliedCoupon}
              />
            </div>
          </div>
        )}
      </div>

      {/* Admin Panel */}
      {showAdmin && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Admin Panel</h2>
          <CouponManagement />
        </div>
      )}

      {/* Security Dashboard */}
      {showSecurity && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🛡️ Security Dashboard</h2>
          <CouponSecurityDashboard />
        </div>
      )}

      {/* Manual Testing Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-4">📋 Manual Testing Checklist</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Create test coupons in admin panel with different types (percentage, fixed)</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Test coupon validation with valid and invalid codes</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Test checkout process with and without coupons</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Verify Stripe integration and payment processing</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Test usage limits and expiration dates</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Test security features (rate limiting, IP blocking)</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Verify database logging and monitoring</span>
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" className="mt-1" />
            <span>Test admin security dashboard functionality</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponIntegrationTest;