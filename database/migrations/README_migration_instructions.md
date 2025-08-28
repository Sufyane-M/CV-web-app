# Istruzioni per l'Esecuzione della Migrazione Keywords

## Panoramica
Questa migrazione aggiunge due nuove colonne alla tabella `cv_analyses` per supportare l'analisi delle keyword:
- `keywords_found`: Array di keyword trovate nel CV che corrispondono alla job description
- `keywords_missing`: Array di keyword mancanti nel CV rispetto alla job description

## Metodi di Esecuzione

### Metodo 1: Dashboard Supabase (Raccomandato)
1. Accedi al tuo progetto Supabase
2. Vai su **SQL Editor**
3. Copia e incolla il contenuto del file `003_add_keywords_columns.sql`
4. Esegui la query

### Metodo 2: Supabase CLI
```bash
# Assicurati di essere nella directory del progetto
cd /path/to/Analizzatore_CV

# Esegui la migrazione
supabase db push

# Oppure applica direttamente il file SQL
supabase db reset --db-url "your-database-url" --file database/migrations/003_add_keywords_columns.sql
```

### Metodo 3: Connessione Diretta PostgreSQL
```bash
# Connettiti al database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Esegui il file SQL
\i database/migrations/003_add_keywords_columns.sql
```

## Verifica dell'Esecuzione
Dopo aver eseguito la migrazione, verifica che le colonne siano state aggiunte:

```sql
-- Verifica la struttura della tabella
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'cv_analyses' 
AND column_name IN ('keywords_found', 'keywords_missing');

-- Verifica gli indici
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'cv_analyses' 
AND indexname LIKE '%keywords%';

-- Verifica le funzioni
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('calculate_keyword_match_percentage', 'get_keyword_stats');
```

## Rollback (Se Necessario)
Se devi annullare la migrazione:

```sql
-- Rimuovi le colonne
ALTER TABLE public.cv_analyses 
DROP COLUMN IF EXISTS keywords_found,
DROP COLUMN IF EXISTS keywords_missing;

-- Rimuovi gli indici
DROP INDEX IF EXISTS idx_cv_analyses_keywords_found;
DROP INDEX IF EXISTS idx_cv_analyses_keywords_missing;

-- Rimuovi le funzioni
DROP FUNCTION IF EXISTS calculate_keyword_match_percentage(TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS get_keyword_stats(UUID);
```

## Note Importanti
- ⚠️ **Backup**: Esegui sempre un backup prima di modificare lo schema del database
- 🔒 **Permessi**: Assicurati di avere i permessi necessari per modificare lo schema
- 📊 **Dati Esistenti**: Le nuove colonne avranno valori di default `'{}'` (array vuoto) per i record esistenti
- 🚀 **Performance**: Gli indici GIN sono ottimizzati per le ricerche su array di testo

## Supporto
Se incontri problemi durante l'esecuzione:
1. Verifica i permessi del database
2. Controlla i log di Supabase per errori specifici
3. Assicurati che la sintassi SQL sia compatibile con PostgreSQL 15+

## Prossimi Passi
Dopo aver eseguito con successo la migrazione:
1. Aggiorna i tipi TypeScript nel progetto
2. Implementa la logica di keyword matching
3. Modifica il frontend per visualizzare i nuovi dati
4. Testa la funzionalità end-to-end