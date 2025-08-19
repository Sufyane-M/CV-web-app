// Test script per verificare il recupero dinamico delle descrizioni
import fetch from 'node-fetch';

async function testDynamicDescriptions() {
  try {
    console.log('🧪 Testing dynamic descriptions API...');
    
    // Test dell'endpoint /bundles
    const response = await fetch('http://localhost:3000/api/stripe/bundles');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const bundles = await response.json();
    
    console.log('✅ API Response received:');
    console.log(JSON.stringify(bundles, null, 2));
    
    // Verifica che i bundle abbiano le descrizioni
    if (bundles.starter && bundles.value) {
      console.log('\n📋 Bundle Descriptions:');
      console.log(`Starter: "${bundles.starter.description}"`);
      console.log(`Value: "${bundles.value.description}"`);
      
      // Verifica se le descrizioni sono diverse da quelle hardcoded
      const hardcodedStarterDesc = 'Ideale per chi vuole testare il nostro servizio';
      const hardcodedValueDesc = 'La scelta migliore per chi cerca il massimo valore';
      
      if (bundles.starter.description !== hardcodedStarterDesc || 
          bundles.value.description !== hardcodedValueDesc) {
        console.log('\n🎉 SUCCESS: Dynamic descriptions are working!');
        console.log('The descriptions are different from hardcoded ones.');
      } else {
        console.log('\n⚠️  WARNING: Descriptions match hardcoded fallbacks.');
        console.log('This might mean Stripe descriptions are not set or API failed.');
      }
    } else {
      console.log('\n❌ ERROR: Missing bundle data in response');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR testing dynamic descriptions:');
    console.error(error.message);
    console.log('\n💡 Make sure:');
    console.log('1. The backend server is running on port 3000');
    console.log('2. Stripe API keys are configured');
    console.log('3. Products have descriptions in Stripe dashboard');
  }
}

// Esegui il test
testDynamicDescriptions();