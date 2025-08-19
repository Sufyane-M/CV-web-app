# 🚀 Analizzatore CV con AI

Un'applicazione web moderna per l'analisi intelligente dei CV utilizzando l'intelligenza artificiale. Aiuta i candidati a ottimizzare i loro curriculum vitae per superare i sistemi ATS (Applicant Tracking System) e migliorare le loro possibilità di essere selezionati.

## ✨ Caratteristiche Principali

### 🔍 Analisi CV
- **Analisi Gratuita**: Punteggio ATS di base e suggerimenti generali
- **Analisi Completa**: Analisi dettagliata delle competenze, confronto con descrizione lavoro, report esportabile
- **Punteggio ATS**: Valutazione della compatibilità con i sistemi di tracciamento
- **Suggerimenti Personalizzati**: Raccomandazioni specifiche per migliorare il CV

### 👤 Gestione Utenti
- **Autenticazione Sicura**: Login/registrazione con email e password
- **Autenticazione Google**: Accesso rapido con account Google
- **Profilo Utente**: Gestione delle informazioni personali
- **Sistema di Crediti**: Acquisto di crediti per analisi complete

### 💳 Sistema di Pagamenti
- **Integrazione Stripe**: Pagamenti sicuri e affidabili
- **Piani Flessibili**: Starter, Professional, Enterprise
- **Gestione Crediti**: Sistema di crediti per le analisi
- **Storico Pagamenti**: Tracciamento degli acquisti

### 📊 Dashboard e Storico
- **Dashboard Personalizzata**: Panoramica delle analisi e statistiche
- **Storico Analisi**: Visualizzazione e gestione delle analisi passate
- **Filtri e Ricerca**: Organizzazione efficiente dei risultati
- **Export Report**: Download dei report in formato PDF

### 🎨 Interfaccia Utente
- **Design Moderno**: Interfaccia pulita e intuitiva
- **Responsive**: Ottimizzata per desktop, tablet e mobile
- **Tema Scuro/Chiaro**: Supporto per entrambi i temi
- **Accessibilità**: Conforme agli standard di accessibilità web

## 🛠️ Stack Tecnologico

### Frontend
- **React 19** - Libreria UI moderna
- **TypeScript** - Tipizzazione statica
- **Vite** - Build tool veloce
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Routing lato client
- **Framer Motion** - Animazioni fluide

### Backend Services
- **Supabase** - Backend-as-a-Service
  - Autenticazione
  - Database PostgreSQL
  - Storage file
  - Real-time subscriptions

### Pagamenti
- **Stripe** - Processore di pagamenti
  - Checkout sicuro
  - Gestione sottoscrizioni
  - Webhook per eventi

### UI Components
- **Headless UI** - Componenti accessibili
- **Heroicons** - Icone SVG
- **Lucide React** - Icone aggiuntive
- **React Hot Toast** - Notifiche toast

## 🚀 Installazione e Setup

### Prerequisiti
- Node.js 18+ 
- npm o pnpm
- Account Supabase
- Account Stripe (per pagamenti)

### 1. Clona il Repository
```bash
git clone https://github.com/your-username/analizzatore-cv.git
cd analizzatore-cv
```

### 2. Installa le Dipendenze
```bash
npm install
# oppure
pnpm install
```

### 3. Configura le Variabili d'Ambiente
Copia il file `.env.example` in `.env` e configura le variabili:

```bash
cp .env.example .env
```

Modifica il file `.env` con le tue configurazioni:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# API
VITE_API_BASE_URL=/api
```

### 4. Setup Supabase

#### Crea le Tabelle
Esegui questi comandi SQL nel tuo progetto Supabase:

```sql
-- Tabella profili utenti
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  credits INTEGER DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella analisi CV
CREATE TABLE cv_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('free', 'complete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  ats_score INTEGER,
  keywords_found TEXT[],
  keywords_missing TEXT[],
  suggestions TEXT[],
  detailed_analysis JSONB,
  job_description TEXT,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella pagamenti
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  credits_purchased INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cv_analyses_updated_at BEFORE UPDATE ON cv_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Configura Row Level Security (RLS)
```sql
-- Abilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy per profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy per cv_analyses
CREATE POLICY "Users can view own analyses" ON cv_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON cv_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON cv_analyses
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy per payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);
```

### 5. Setup Stripe

#### Crea un Account Stripe
1. Vai su [stripe.com](https://stripe.com) e crea un account
2. Attiva la modalità test per lo sviluppo
3. Ottieni le chiavi API dalla dashboard

#### Configura le Chiavi Stripe
Nel file `.env` principale:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
```

Nel file `api/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_[your_webhook_secret_here]
```

#### Trova le Tue Chiavi Stripe
1. Accedi alla [Dashboard Stripe](https://dashboard.stripe.com)
2. Vai su "Developers" > "API keys"
3. Copia la "Publishable key" (inizia con `pk_test_`)
4. Copia la "Secret key" (inizia con `sk_test_`)
5. Per il webhook secret, vai su "Developers" > "Webhooks"

⚠️ **Importante**: Senza chiavi Stripe valide, i pagamenti non funzioneranno e vedrai errori 401.

### 6. Avvia l'Applicazione
```bash
npm run dev
# oppure
pnpm dev
```

L'applicazione sarà disponibile su `http://localhost:5173`

## 📁 Struttura del Progetto

```
src/
├── components/          # Componenti riutilizzabili
│   ├── ui/             # Componenti UI base
│   └── layout/         # Componenti di layout
├── contexts/           # Context providers
│   ├── AuthContext.tsx
│   ├── AnalysisContext.tsx
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── pages/              # Pagine dell'applicazione
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── AnalysisPage.tsx
│   ├── HistoryPage.tsx
│   ├── SettingsPage.tsx
│   ├── PricingPage.tsx
│   ├── PaymentSuccessPage.tsx
│   └── PaymentCancelPage.tsx
├── services/           # Servizi API
│   ├── supabase.ts
│   ├── stripe.ts
│   └── analysis.ts
├── utils/              # Utility functions
│   ├── formatters.ts
│   ├── validation.ts
│   └── constants.ts
├── types/              # Definizioni TypeScript
└── styles/             # Stili globali
```

## 🔧 Configurazione Avanzata

### Stripe Webhook
Per gestire gli eventi di pagamento, configura un webhook Stripe:

1. Nel dashboard Stripe, vai su "Developers" > "Webhooks"
2. Aggiungi endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Seleziona eventi: `checkout.session.completed`, `payment_intent.succeeded`

### Variabili d'Ambiente di Produzione
```env
# Produzione
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_prod_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[your_live_stripe_key]
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_APP_URL=https://your-domain.com
VITE_DEV_MODE=false
```

## 🚀 Deploy

### Vercel (Raccomandato)
1. Connetti il repository a Vercel (un solo progetto)
2. Build Command: `pnpm build` — Output Directory: `dist`
3. Le API sono deployate come Serverless Functions in `api/[...path].js`
4. Configura le variabili d'ambiente in Vercel (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `VITE_API_BASE_URL=/api`
- `VITE_APP_URL=https://<tuo-dominio-vercel>`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
5. Configura il webhook Stripe all'endpoint: `https://<tuo-dominio>/api/stripe/webhook`

### Netlify
1. Connetti il repository a Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Configura le variabili d'ambiente

### Build Manuale
```bash
npm run build
```

I file di build saranno nella cartella `dist/`

## 🧪 Testing

```bash
# Test unitari
npm run test

# Test con coverage
npm run test:coverage

# Test end-to-end
npm run test:e2e
```

## 📝 API Documentation

### Endpoints Principali

#### Autenticazione
- `POST /auth/login` - Login utente
- `POST /auth/register` - Registrazione utente
- `POST /auth/logout` - Logout utente

#### Analisi CV
- `POST /analysis/upload` - Upload e analisi CV
- `GET /analysis/history` - Storico analisi
- `GET /analysis/:id` - Dettagli analisi
- `DELETE /analysis/:id` - Elimina analisi

#### Pagamenti
- `POST /payments/create-checkout-session` - Crea sessione Stripe
- `GET /payments/verify-session/:sessionId` - Verifica pagamento
- `GET /payments/history` - Storico pagamenti

## 🤝 Contribuire

1. Fork del progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push del branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 🆘 Supporto

- **Email**: support@cvanalyzer.pro
- **Documentation**: [docs.cvanalyzer.pro](https://docs.cvanalyzer.pro)
- **Issues**: [GitHub Issues](https://github.com/your-username/analizzatore-cv/issues)

## 🙏 Ringraziamenti

- [React](https://reactjs.org/) - Libreria UI
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [Stripe](https://stripe.com/) - Processore pagamenti
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Heroicons](https://heroicons.com/) - Icone SVG

---

**Sviluppato con ❤️ per aiutare i professionisti a migliorare i loro CV**