
// IMPORTANTE: Questo è l'URL a cui l'applicazione invierà il file PDF.
// L'URL viene letto dalla variabile d'ambiente VITE_AI_WEBHOOK_URL
// Se non è definita, usa un URL di fallback
export const UPLOAD_URL = import.meta.env.VITE_AI_WEBHOOK_URL || 'https://example.com/api/upload';
