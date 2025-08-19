# Sistema Payment Links - Configurazione e Funzionamento

## Panoramica
Il sistema è stato aggiornato per utilizzare i Stripe Payment Links invece delle sessioni di checkout tradizionali. Questo approccio semplifica il processo di pagamento e migliora l'esperienza utente.

## Payment Links Configurati

### Pacchetto Base
- **URL**: `https://buy.stripe.com/aFabJ0cEc1un5E8aZY0Ba06`
- **Prezzo**: €4.99
- **Crediti**: 4
- **Descrizione**: Ideale per chi vuole testare il nostro servizio

### Pacchetto Premium
- **URL**: `https://buy.stripe.com/00wbJ00Vu0qj4A45FE0Ba05`
- **Prezzo**: €9.99
- **Crediti**: 10
- **Descrizione**: La scelta migliore per chi cerca il massimo valore

## Flusso di Pagamento

### 1. Selezione del Pacchetto
- L'utente seleziona un pacchetto dalla pagina pricing
- Il sistema salva i dettagli del pagamento in `sessionStorage`
- L'utente viene reindirizzato al Payment Link di Stripe

### 2. Processo di Pagamento
- L'utente completa il pagamento su Stripe
- Stripe reindirizza l'utente alla pagina di successo con `session_id`

### 3. Verifica del Pagamento
- La pagina di successo recupera i dettagli dal `sessionStorage`
- Invia una richiesta di verifica al backend con `session_id` e dettagli del bundle
- Il backend verifica la sessione con Stripe e aggiorna i crediti dell'utente

## File Modificati

### Frontend
- `src/services/stripe.ts`: Configurazione bundles e payment links
- `src/pages/PaymentErrorPage.tsx`: Nuova pagina per gestire errori di pagamento
- `src/App.tsx`: Aggiunta rotta per pagina di errore

### Backend
- `api/routes/payment-links.js`: Nuovo endpoint per gestire payment links
- `api/app.js`: Integrazione delle nuove rotte
- `api/routes/stripe.js`: Aggiornamento configurazione bundles
- `api/stripe/create-checkout-session.js`: Aggiornamento configurazione bundles

## Configurazione URL di Ritorno

I Payment Links di Stripe dovrebbero essere configurati con questi URL:

### URL di Successo
```
https://your-domain.com/payment/success?session_id={CHECKOUT_SESSION_ID}
```

### URL di Cancellazione
```
https://your-domain.com/payment/cancel
```

### URL di Errore (opzionale)
```
https://your-domain.com/payment/error?error=payment_failed
```

## Gestione Errori

Il sistema gestisce diversi tipi di errori:
- `missing_session`: Sessione di pagamento mancante
- `session_not_found`: Sessione non trovata su Stripe
- `payment_not_completed`: Pagamento non completato
- `processing_failed`: Errore durante l'elaborazione

## Sicurezza

- Tutti i pagamenti sono processati direttamente da Stripe
- La verifica delle sessioni avviene lato server
- I dettagli sensibili non sono mai esposti al frontend
- Le transazioni sono registrate per audit e supporto

## Monitoraggio

- Tutti i pagamenti sono tracciati nei log del server
- Le sessioni fallite sono registrate per debug
- I webhook di Stripe forniscono notifiche in tempo reale

## Supporto

Per problemi con i pagamenti:
1. Verificare i log del server per errori
2. Controllare la dashboard di Stripe per lo stato delle transazioni
3. Verificare che gli URL di ritorno siano configurati correttamente
4. Assicurarsi che i webhook siano attivi e funzionanti