import { ErrorType, ErrorSeverity, ErrorAction } from '../components/ui/ErrorMessage';

export interface ErrorMessageConfig {
  type: ErrorType;
  severity: ErrorSeverity;
  title: string;
  message: string;
  description?: string;
  actions?: ErrorAction[];
}

/**
 * Messaggi di errore predefiniti con spiegazioni chiare e istruzioni per la risoluzione
 */
export const ERROR_MESSAGES = {
  // Errori di validazione
  VALIDATION: {
    REQUIRED_FIELD: {
      type: 'validation' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Campo richiesto',
      message: 'Questo campo è necessario per continuare',
      description: 'Ti preghiamo di compilare questo campo. È importante per completare l\'operazione.',
      actions: [{
        label: 'Compila campo',
        onClick: () => {},
        variant: 'primary' as const,
      }],
    },
    INVALID_EMAIL: {
      type: 'validation' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Indirizzo email non valido',
      message: 'L\'indirizzo email inserito non è corretto',
      description: 'Controlla che l\'email sia nel formato corretto (esempio: mario.rossi@email.com).',
      actions: [{
        label: 'Correggi email',
        onClick: () => {},
        variant: 'primary' as const,
      }],
    },
    WEAK_PASSWORD: {
      type: 'validation' as ErrorType,
      severity: 'warning' as ErrorSeverity,
      title: 'Password non sufficientemente sicura',
      message: 'La password scelta non rispetta i criteri di sicurezza',
      description: 'Per la tua sicurezza, usa almeno 8 caratteri con lettere maiuscole, minuscole, numeri e simboli.',
      actions: [{
        label: 'Migliora password',
        onClick: () => {},
        variant: 'primary' as const,
      }],
    },
    FILE_TOO_LARGE: {
      type: 'file' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'File troppo grande',
      message: 'Il file che hai selezionato è troppo grande',
      description: 'Scegli un file più piccolo di 5MB. Puoi comprimere il file o selezionarne uno diverso.',
      actions: [{
        label: 'Scegli altro file',
        onClick: () => {},
        variant: 'primary' as const,
      }],
    },
    INVALID_FILE_TYPE: {
      type: 'file' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Formato file non supportato',
      message: 'Il tipo di file selezionato non è compatibile',
      description: 'Carica un file in formato PDF. Altri formati non sono attualmente supportati.',
      actions: [{
        label: 'Cambia file',
        onClick: () => {},
        variant: 'primary' as const,
      }],
    },
  },

  // Errori di rete
  NETWORK: {
    OFFLINE: {
      type: 'network' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Nessuna connessione internet',
      message: 'Non riusciamo a connetterci a internet',
      description: 'Controlla la tua connessione Wi-Fi o dati mobili e riprova. Se il problema persiste, contatta il tuo provider.',
      actions: [
        {
          label: 'Riprova connessione',
          onClick: () => window.location.reload(),
          variant: 'primary' as const,
        },
      ],
    },
    CONNECTION_ERROR: {
      type: 'network' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Problema di connessione',
      message: 'Non riesco a connettermi al server',
      description: 'Verifica la tua connessione internet e riprova. Se il problema persiste, potrebbe essere temporaneo.',
      actions: [
        {
          label: 'Riprova',
          onClick: () => window.location.reload(),
          variant: 'primary' as const,
        },
      ],
    },
    TIMEOUT_ERROR: {
      type: 'network' as ErrorType,
      severity: 'warning' as ErrorSeverity,
      title: 'Richiesta troppo lenta',
      message: 'La connessione sta impiegando più tempo del previsto',
      description: 'Il server potrebbe essere sovraccarico. Attendi qualche secondo e riprova.',
      actions: [
        {
          label: 'Riprova ora',
          onClick: () => window.location.reload(),
          variant: 'primary' as const,
        },
      ],
    },
    SERVER_ERROR: {
      type: 'server' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Problema temporaneo del servizio',
      message: 'I nostri server stanno riscontrando difficoltà',
      description: 'Stiamo lavorando per risolvere il problema. Riprova tra qualche minuto.',
      actions: [
        {
          label: 'Riprova tra poco',
          onClick: () => window.location.reload(),
          variant: 'outline' as const,
        },
      ],
    },
    BAD_REQUEST: {
      type: 'network' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Richiesta non valida',
      message: 'I dati inviati non sono corretti',
      description: 'Controlla le informazioni inserite e riprova.',
      actions: [
        {
          label: 'Verifica dati',
          onClick: () => {},
          variant: 'primary' as const,
        },
      ],
    },
    NOT_FOUND: {
      type: 'network' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Risorsa non trovata',
      message: 'La pagina o il contenuto richiesto non esiste',
      description: 'Il link potrebbe essere scaduto o non più valido.',
      actions: [
        {
          label: 'Torna indietro',
          onClick: () => window.history.back(),
          variant: 'outline' as const,
        },
      ],
    },
  },

  // Errori di autenticazione
  AUTH: {
    INVALID_CREDENTIALS: {
      type: 'authentication' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Dati di accesso non corretti',
      message: 'L\'email o la password inserita non sono corrette',
      description: 'Controlla attentamente i dati inseriti. Se hai dimenticato la password, puoi reimpostarla cliccando sul link qui sotto.',
      actions: [
        {
          label: 'Password dimenticata?',
          onClick: () => {/* Navigate to reset password */},
          variant: 'primary' as const,
        },
      ],
    },
    SESSION_EXPIRED: {
      type: 'authentication' as ErrorType,
      severity: 'warning' as ErrorSeverity,
      title: 'Sessione scaduta',
      message: 'La tua sessione è scaduta per motivi di sicurezza',
      description: 'Per continuare a utilizzare il servizio in modo sicuro, effettua nuovamente il login.',
      actions: [
        {
          label: 'Accedi di nuovo',
          onClick: () => {/* Navigate to login */},
          variant: 'primary' as const,
        },
      ],
    },
    ACCOUNT_LOCKED: {
      type: 'authentication' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Account temporaneamente bloccato',
      message: 'Il tuo account è stato bloccato per troppi tentativi di accesso',
      description: 'Per sicurezza, attendi 15 minuti prima di riprovare o reimposta la password per sbloccare immediatamente l\'account.',
      actions: [
        {
          label: 'Reimposta password',
          onClick: () => {/* Navigate to reset password */},
          variant: 'primary' as const,
        },
      ],
    },
    EMAIL_NOT_VERIFIED: {
      type: 'authentication' as ErrorType,
      severity: 'warning' as ErrorSeverity,
      title: 'Email non verificata',
      message: 'Devi verificare il tuo indirizzo email per continuare',
      description: 'Controlla la tua casella di posta e clicca sul link di verifica che ti abbiamo inviato.',
      actions: [
        {
          label: 'Invia di nuovo',
          onClick: () => {/* Resend verification email */},
          variant: 'primary' as const,
        },
      ],
    },
    UNAUTHORIZED: {
      type: 'authentication' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Accesso non autorizzato',
      message: 'Non sei autorizzato ad accedere a questa risorsa',
      description: 'Effettua il login per continuare o verifica di avere i permessi necessari.',
      actions: [
        {
          label: 'Vai al login',
          onClick: () => {/* Navigate to login */},
          variant: 'primary' as const,
        },
      ],
    },
    FORBIDDEN: {
      type: 'authentication' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Accesso vietato',
      message: 'Non hai i permessi per accedere a questa risorsa',
      description: 'Il tuo account non ha i privilegi necessari per questa operazione.',
      actions: [
        {
          label: 'Torna indietro',
          onClick: () => window.history.back(),
          variant: 'outline' as const,
        },
      ],
    },
    LOGIN_FAILED: {
      type: 'authentication' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Login fallito',
      message: 'Impossibile completare il login',
      description: 'Si è verificato un errore durante il processo di autenticazione. Riprova.',
      actions: [
        {
          label: 'Riprova',
          onClick: () => {/* Retry login */},
          variant: 'primary' as const,
        },
      ],
    },
  },

  // Errori di autorizzazione
  AUTHORIZATION: {
    ACCESS_DENIED: {
      type: 'authorization' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Accesso non autorizzato',
      message: 'Non hai i permessi necessari per visualizzare questa pagina',
      description: 'Effettua il login con un account autorizzato per accedere a questo contenuto. Se pensi che sia un errore, contatta il supporto.',
      actions: [
        {
          label: 'Vai al login',
          onClick: () => {/* Navigate to login */},
          variant: 'primary' as const,
        },
      ],
    },
    SUBSCRIPTION_REQUIRED: {
      type: 'authorization' as ErrorType,
      severity: 'info' as ErrorSeverity,
      title: 'Funzionalità Premium',
      message: 'Questa funzionalità è disponibile solo con un abbonamento Premium',
      description: 'Sblocca tutte le funzionalità avanzate e migliora la tua esperienza con un piano Premium.',
      actions: [
        {
          label: 'Scopri Premium',
          onClick: () => {/* Navigate to pricing */},
          variant: 'primary' as const,
        },
        {
          label: 'Più tardi',
          onClick: () => {/* Close modal */},
          variant: 'outline' as const,
        },
      ],
    },
    INSUFFICIENT_PERMISSIONS: {
      type: 'authorization' as ErrorType,
      severity: 'warning' as ErrorSeverity,
      title: 'Permessi insufficienti',
      message: 'Il tuo ruolo non ti consente di eseguire questa azione',
      description: 'Contatta l\'amministratore del sistema per richiedere i permessi necessari.',
      actions: [
        {
          label: 'Contatta admin',
          onClick: () => {/* Contact admin */},
          variant: 'primary' as const,
        },
      ],
    },
  },

  // Errori di pagamento
  PAYMENT: {
    CARD_DECLINED: {
      type: 'payment' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Carta rifiutata',
      message: 'Il pagamento non è stato autorizzato dalla tua banca',
      description: 'Verifica i dati della carta o prova con un altro metodo di pagamento. Contatta la tua banca se il problema persiste.',
      actions: [
        {
          label: 'Riprova',
          onClick: () => {/* Retry payment */},
          variant: 'primary' as const,
        },
        {
          label: 'Cambia carta',
          onClick: () => {/* Change payment method */},
          variant: 'secondary' as const,
        },
      ],
    },
    INSUFFICIENT_FUNDS: {
      type: 'payment' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Fondi insufficienti',
      message: 'Non ci sono abbastanza fondi sulla carta',
      description: 'Verifica il saldo del tuo conto o utilizza un altro metodo di pagamento.',
      actions: [
        {
          label: 'Cambia carta',
          onClick: () => {/* Change payment method */},
          variant: 'primary' as const,
        },
      ],
    },
    PAYMENT_FAILED: {
      type: 'payment' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Pagamento fallito',
      message: 'Si è verificato un errore durante il pagamento',
      description: 'Non ti è stato addebitato nulla. Riprova o contatta il supporto se il problema persiste.',
      actions: [
        {
          label: 'Riprova',
          onClick: () => {/* Retry payment */},
          variant: 'primary' as const,
        },
        {
          label: 'Contatta supporto',
          onClick: () => {/* Contact support */},
          variant: 'secondary' as const,
        },
      ],
    },
  },

  // Errori generici
  GENERIC: {
    UNKNOWN_ERROR: {
      type: 'generic' as ErrorType,
      severity: 'error' as ErrorSeverity,
      title: 'Errore imprevisto',
      message: 'Si è verificato un errore inaspettato',
      description: 'Riprova l\'operazione. Se il problema persiste, contatta il supporto tecnico.',
      actions: [
        {
          label: 'Riprova',
          onClick: () => window.location.reload(),
          variant: 'primary' as const,
        },
      ],
    },
    MAINTENANCE: {
      type: 'server' as ErrorType,
      severity: 'info' as ErrorSeverity,
      title: 'Manutenzione in corso',
      message: 'Il servizio è temporaneamente non disponibile',
      description: 'Stiamo effettuando alcuni miglioramenti. Il servizio sarà ripristinato a breve.',
    },
  },
} as const;

/**
 * Funzione helper per ottenere un messaggio di errore personalizzato
 */
export const getErrorMessage = (
  category: keyof typeof ERROR_MESSAGES,
  type: string,
  customMessage?: string,
  customDescription?: string,
  customActions?: ErrorAction[]
): ErrorMessageConfig => {
  const baseError = (ERROR_MESSAGES[category] as any)[type] || ERROR_MESSAGES.GENERIC.UNKNOWN_ERROR;
  
  return {
    ...baseError,
    message: customMessage || baseError.message,
    description: customDescription || baseError.description,
    actions: customActions || baseError.actions,
  };
};

/**
 * Funzione per creare messaggi di errore di validazione dinamici
 */
export const createValidationError = (
  fieldName: string,
  validationType: 'required' | 'invalid' | 'tooShort' | 'tooLong',
  customMessage?: string
): ErrorMessageConfig => {
  const messages = {
    required: `${fieldName} è obbligatorio`,
    invalid: `${fieldName} non è valido`,
    tooShort: `${fieldName} è troppo corto`,
    tooLong: `${fieldName} è troppo lungo`,
  };

  return {
    type: 'validation',
    severity: 'error',
    title: 'Errore di validazione',
    message: customMessage || messages[validationType],
    description: 'Correggi il campo evidenziato per continuare.',
  };
};

/**
 * Funzione per creare messaggi di errore API dinamici
 */
export const createApiError = (
  statusCode: number,
  customMessage?: string,
  customDescription?: string
): ErrorMessageConfig => {
  const statusMessages: Record<number, { message: string; description: string; type: ErrorType; severity: ErrorSeverity }> = {
    400: {
      message: 'Richiesta non valida',
      description: 'I dati inviati non sono corretti. Verifica e riprova.',
      type: 'validation',
      severity: 'error',
    },
    401: {
      message: 'Accesso non autorizzato',
      description: 'Devi effettuare l\'accesso per continuare.',
      type: 'authentication',
      severity: 'error',
    },
    403: {
      message: 'Accesso vietato',
      description: 'Non hai i permessi necessari per questa operazione.',
      type: 'authorization',
      severity: 'error',
    },
    404: {
      message: 'Risorsa non trovata',
      description: 'La pagina o il contenuto richiesto non esiste.',
      type: 'generic',
      severity: 'error',
    },
    429: {
      message: 'Troppe richieste',
      description: 'Hai superato il limite di richieste. Attendi qualche momento.',
      type: 'network',
      severity: 'warning',
    },
    500: {
      message: 'Errore interno del server',
      description: 'Si è verificato un problema tecnico. Riprova più tardi.',
      type: 'server',
      severity: 'error',
    },
    502: {
      message: 'Servizio temporaneamente non disponibile',
      description: 'Il server è sovraccarico. Riprova tra qualche minuto.',
      type: 'server',
      severity: 'warning',
    },
    503: {
      message: 'Servizio in manutenzione',
      description: 'Il servizio è temporaneamente offline per manutenzione.',
      type: 'server',
      severity: 'info',
    },
  };

  const defaultError = {
    message: 'Errore di connessione',
    description: 'Si è verificato un problema di comunicazione con il server.',
    type: 'network' as ErrorType,
    severity: 'error' as ErrorSeverity,
  };

  const errorInfo = statusMessages[statusCode] || defaultError;

  return {
    type: errorInfo.type,
    severity: errorInfo.severity,
    title: `Errore ${statusCode}`,
    message: customMessage || errorInfo.message,
    description: customDescription || errorInfo.description,
    actions: statusCode >= 500 ? [
      {
        label: 'Riprova',
        onClick: () => window.location.reload(),
        variant: 'primary',
      },
    ] : undefined,
  };
};