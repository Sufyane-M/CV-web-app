# Configurazione Price ID Stripe

## Problema Risolto

L'applicazione mostrava prezzi hardcoded ("Pacchetto Premium" €9.99 e "Pacchetto Base" €4.99) invece di utilizzare i prodotti reali configurati su Stripe.

## Soluzione Implementata

### Price ID Configurati

Sono stati configurati i seguenti Price ID nei file di ambiente:

#### Pacchetto Base (€4.99)
- **Price ID**: `price_1RtUD3CrDiPBhim5deeUX1IW`
- **Prodotto Stripe**: `prod_Sp8TGtROaSKCjH`
- **Crediti**: 4
- **Descrizione**: "Ideale per chi vuole testare il nostro servizio"

#### Pacchetto Premium (€9.99)
- **Price ID**: `price_1RtUD8CrDiPBhim5Ba5aMNou`
- **Prodotto Stripe**: `prod_Sp8TRWwG6QZbvC`
- **Crediti**: 10
- **Descrizione**: "La scelta migliore per chi cerca il massimo valore"

### File Aggiornati

1. **`.env`** (sviluppo):
   ```env
   STRIPE_PRICE_ID_STARTER=price_1RtUD3CrDiPBhim5deeUX1IW
   STRIPE_PRICE_ID_VALUE=price_1RtUD8CrDiPBhim5Ba5aMNou
   ```

2. **`.env.production`** (produzione):
   ```env
   STRIPE_PRICE_ID_STARTER=price_1RtUD3CrDiPBhim5deeUX1IW
   STRIPE_PRICE_ID_VALUE=price_1RtUD8CrDiPBhim5Ba5aMNou
   ```

### Come Funziona

Il file `api/routes/stripe.js` ora utilizza i Price ID dalle variabili d'ambiente:

```javascript
const BUNDLES = {
  starter: {
    // ...
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || null
  },
  value: {
    // ...
    stripePriceId: process.env.STRIPE_PRICE_ID_VALUE || null
  }
};
```

- **Se i Price ID sono configurati**: Utilizza i prodotti reali di Stripe
- **Se i Price ID non sono configurati**: Crea prezzi dinamicamente (modalità sviluppo)

### Verifica

Dopo il riavvio del server, l'applicazione ora:
1. Utilizza i prodotti reali configurati su Stripe Dashboard
2. I pagamenti vengono processati correttamente
3. Non ci sono più "copie" o prodotti duplicati

### Prodotti da Disattivare (Opzionale)

Per evitare confusione, considera di disattivare il prodotto duplicato:
- **"Pacchetto base CV"** (`prod_SnvWjgbhWXxTlr`) - Price ID: `price_1RsJf1CrDiPBhim5lZLtNzPz`

Questo può essere fatto dal Stripe Dashboard > Products > [Prodotto] > Actions > Archive product.