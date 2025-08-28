import { Database } from '../types/database';

type CVAnalysis = Database['public']['Tables']['cv_analyses']['Row'];

export interface KeywordAnalysisResult {
  keywordsFound: string[];
  keywordsMissing: string[];
  matchPercentage: number;
  totalJobKeywords: number;
  foundKeywords: number;
}

export interface KeywordExtractionOptions {
  minLength?: number;
  excludeCommonWords?: boolean;
  caseSensitive?: boolean;
  includePartialMatches?: boolean;
  semanticMatching?: boolean;
}

class KeywordAnalysisService {
  // Lista di parole comuni da escludere (stop words)
  private readonly commonWords = new Set([
    // Italiano
    'il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 'del', 'della',
    'dei', 'delle', 'al', 'alla', 'agli', 'alle', 'nel', 'nella', 'nei', 'nelle', 'sul',
    'sulla', 'sui', 'sulle', 'dal', 'dalla', 'dai', 'dalle', 'come', 'più', 'anche', 'solo',
    'già', 'ancora', 'molto', 'bene', 'dove', 'quando', 'perché', 'così', 'tutto', 'tutti',
    'ogni', 'altro', 'altri', 'altre', 'stesso', 'stessa', 'stessi', 'stesse', 'proprio',
    'propria', 'propri', 'proprie', 'questo', 'questa', 'questi', 'queste', 'quello',
    'quella', 'quelli', 'quelle', 'essere', 'avere', 'fare', 'dire', 'andare', 'vedere',
    'sapere', 'dare', 'stare', 'volere', 'dovere', 'potere',
    // English
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not',
    'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from',
    'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
    'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
    'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
    'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
    'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
  ]);

  // Pattern per identificare skill tecniche e competenze
  private readonly technicalPatterns = [
    // Linguaggi di programmazione
    /\b(javascript|typescript|python|java|c\+\+|c#|php|ruby|go|rust|swift|kotlin|scala|r|matlab)\b/gi,
    // Framework e librerie
    /\b(react|angular|vue|node\.?js|express|django|flask|spring|laravel|rails|jquery|bootstrap)\b/gi,
    // Database
    /\b(mysql|postgresql|mongodb|redis|elasticsearch|oracle|sql\s?server|sqlite|cassandra)\b/gi,
    // Cloud e DevOps
    /\b(aws|azure|gcp|docker|kubernetes|jenkins|gitlab|github|terraform|ansible)\b/gi,
    // Metodologie
    /\b(agile|scrum|kanban|devops|ci\/cd|tdd|bdd)\b/gi
  ];

  /**
   * Estrae le keyword da un testo
   */
  extractKeywords(text: string, options: KeywordExtractionOptions = {}): string[] {
    const {
      minLength = 2,
      excludeCommonWords = true,
      caseSensitive = false,
      includePartialMatches = true
    } = options;

    if (!text || typeof text !== 'string') {
      return [];
    }

    // Normalizza il testo
    let normalizedText = caseSensitive ? text : text.toLowerCase();
    
    // Rimuovi caratteri speciali ma mantieni spazi, trattini e punti per acronimi
    normalizedText = normalizedText.replace(/[^\w\s\-\.]/g, ' ');
    
    // Estrai parole e frasi
    const words = new Set<string>();
    
    // Estrai singole parole usando regex che supporta apostrofi e trattini interni
    const wordPattern = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/gu;
    const singleWords = normalizedText.match(wordPattern) || [];
    singleWords.forEach(word => {
      // Normalizza il token (trim e toLowerCase)
      const normalizedWord = word.trim().toLowerCase();
      if (normalizedWord.length >= minLength && (!excludeCommonWords || !this.commonWords.has(normalizedWord))) {
        words.add(normalizedWord);
      }
    });

    // Estrai skill tecniche usando pattern
    this.technicalPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const cleanMatch = caseSensitive ? match : match.toLowerCase();
        words.add(cleanMatch);
      });
    });

    // Estrai frasi composte (2-3 parole) per competenze specifiche
    if (includePartialMatches) {
      const phrases = normalizedText.match(/\b\w+[\s\-]\w+(?:[\s\-]\w+)?\b/g) || [];
      phrases.forEach(phrase => {
        const cleanPhrase = phrase.trim();
        if (cleanPhrase.length >= minLength * 2 && !this.isCommonPhrase(cleanPhrase)) {
          words.add(cleanPhrase);
        }
      });
    }

    return Array.from(words).sort();
  }

  /**
   * Verifica se una frase è composta principalmente da parole comuni
   */
  private isCommonPhrase(phrase: string): boolean {
    const words = phrase.split(/[\s\-]+/);
    const commonWordCount = words.filter(word => this.commonWords.has(word)).length;
    return commonWordCount / words.length > 0.7; // Se più del 70% sono parole comuni
  }

  /**
   * Trova le keyword corrispondenti tra CV e job description
   */
  findMatchingKeywords(
    cvKeywords: string[],
    jobKeywords: string[],
    options: KeywordExtractionOptions = {}
  ): string[] {
    const {
      caseSensitive = false,
      includePartialMatches = true
    } = options;

    const matches = new Set<string>();
    
    // Normalizza le keyword per il confronto
    const normalizedCvKeywords = caseSensitive 
      ? cvKeywords 
      : cvKeywords.map(k => k.toLowerCase());
    const normalizedJobKeywords = caseSensitive 
      ? jobKeywords 
      : jobKeywords.map(k => k.toLowerCase());

    // Trova corrispondenze esatte
    normalizedJobKeywords.forEach((jobKeyword, index) => {
      if (normalizedCvKeywords.includes(jobKeyword)) {
        matches.add(jobKeywords[index]); // Usa la versione originale
      }
    });

    // Trova corrispondenze parziali se abilitato
    if (includePartialMatches) {
      normalizedJobKeywords.forEach((jobKeyword, jobIndex) => {
        normalizedCvKeywords.forEach((cvKeyword, cvIndex) => {
          // Verifica se una keyword è contenuta nell'altra (per skill composite)
          if (jobKeyword.length > 3 && cvKeyword.includes(jobKeyword)) {
            matches.add(jobKeywords[jobIndex]);
          } else if (cvKeyword.length > 3 && jobKeyword.includes(cvKeyword)) {
            matches.add(jobKeywords[jobIndex]);
          }
          // Verifica similarità per acronimi e varianti
          else if (this.areSimilarKeywords(jobKeyword, cvKeyword)) {
            matches.add(jobKeywords[jobIndex]);
          }
        });
      });
    }

    return Array.from(matches).sort();
  }

  /**
   * Verifica se due keyword sono simili (per gestire varianti e acronimi)
   */
  private areSimilarKeywords(keyword1: string, keyword2: string): boolean {
    // Gestisci acronimi comuni
    const acronymMap: Record<string, string[]> = {
      'js': ['javascript'],
      'ts': ['typescript'],
      'css': ['cascading style sheets'],
      'html': ['hypertext markup language'],
      'sql': ['structured query language'],
      'api': ['application programming interface'],
      'ui': ['user interface'],
      'ux': ['user experience'],
      'ai': ['artificial intelligence'],
      'ml': ['machine learning'],
      'ci/cd': ['continuous integration', 'continuous deployment'],
      'aws': ['amazon web services'],
      'gcp': ['google cloud platform']
    };

    // Verifica se una è l'acronimo dell'altra
    const expansions1 = acronymMap[keyword1] || [];
    const expansions2 = acronymMap[keyword2] || [];
    
    if (expansions1.includes(keyword2) || expansions2.includes(keyword1)) {
      return true;
    }

    // Verifica similarità per varianti comuni (es. "node.js" vs "nodejs")
    const normalized1 = keyword1.replace(/[\s\-\.]/g, '');
    const normalized2 = keyword2.replace(/[\s\-\.]/g, '');
    
    return normalized1 === normalized2;
  }

  /**
   * Trova le keyword mancanti nel CV rispetto alla job description
   */
  findMissingKeywords(
    cvKeywords: string[],
    jobKeywords: string[],
    foundKeywords: string[],
    options: KeywordExtractionOptions = {}
  ): string[] {
    const { caseSensitive = false } = options;
    
    const normalizedFound = caseSensitive 
      ? foundKeywords 
      : foundKeywords.map(k => k.toLowerCase());
    
    const missing = jobKeywords.filter(jobKeyword => {
      const normalizedJobKeyword = caseSensitive ? jobKeyword : jobKeyword.toLowerCase();
      return !normalizedFound.includes(normalizedJobKeyword);
    });

    // Ordina per importanza (keyword più lunghe e tecniche prima)
    return missing.sort((a, b) => {
      const aIsTechnical = this.isTechnicalKeyword(a);
      const bIsTechnical = this.isTechnicalKeyword(b);
      
      if (aIsTechnical && !bIsTechnical) return -1;
      if (!aIsTechnical && bIsTechnical) return 1;
      
      return b.length - a.length; // Keyword più lunghe prima
    });
  }

  /**
   * Verifica se una keyword è tecnica/specializzata
   */
  private isTechnicalKeyword(keyword: string): boolean {
    return this.technicalPatterns.some(pattern => pattern.test(keyword));
  }

  /**
   * Analizza le keyword tra CV e job description
   */
  analyzeKeywords(
    cvText: string,
    jobDescription: string,
    options: KeywordExtractionOptions = {}
  ): KeywordAnalysisResult {
    // Estrai keyword da entrambi i testi
    const cvKeywords = this.extractKeywords(cvText, options);
    const jobKeywords = this.extractKeywords(jobDescription, options);
    
    // Trova corrispondenze
    const keywordsFound = this.findMatchingKeywords(cvKeywords, jobKeywords, options);
    
    // Trova keyword mancanti
    const keywordsMissing = this.findMissingKeywords(
      cvKeywords,
      jobKeywords,
      keywordsFound,
      options
    );
    
    // Calcola statistiche
    const totalJobKeywords = jobKeywords.length;
    const foundKeywords = keywordsFound.length;
    const matchPercentage = totalJobKeywords > 0 
      ? Math.round((foundKeywords / totalJobKeywords) * 100) 
      : 0;

    return {
      keywordsFound,
      keywordsMissing,
      matchPercentage,
      totalJobKeywords,
      foundKeywords
    };
  }

  /**
   * Aggiorna un'analisi esistente con i dati delle keyword
   */
  async updateAnalysisWithKeywords(
    analysisId: string,
    keywordAnalysis: KeywordAnalysisResult
  ): Promise<boolean> {
    try {
      // Validazione dei parametri
      if (!analysisId || typeof analysisId !== 'string' || analysisId.trim() === '') {
        console.error('Invalid analysisId provided to updateAnalysisWithKeywords:', analysisId);
        return false;
      }

      if (!keywordAnalysis || typeof keywordAnalysis !== 'object') {
        console.error('Invalid keywordAnalysis payload provided to updateAnalysisWithKeywords:', keywordAnalysis);
        return false;
      }

      // Validazione dei campi richiesti nel payload
      const requiredFields = ['keywordsFound', 'keywordsMissing', 'matchPercentage', 'totalJobKeywords', 'foundKeywords'];
      for (const field of requiredFields) {
        if (!(field in keywordAnalysis)) {
          console.error(`Missing required field '${field}' in keywordAnalysis payload for analysis ${analysisId}`);
          return false;
        }
      }

      // Importa il client database
      const { db } = await import('./supabase');

      // Prepara i dati per l'aggiornamento
      const updateData = {
        keywords_found: keywordAnalysis.keywordsFound,
        keywords_missing: keywordAnalysis.keywordsMissing,
        updated_at: new Date().toISOString()
      };

      // Esegue l'aggiornamento nel database
      const { data, error } = await db.analyses.update(analysisId, updateData);

      if (error) {
        console.error('Database error updating analysis with keywords:', {
          analysisId,
          error: error.message || error,
          context: 'updateAnalysisWithKeywords'
        });
        return false;
      }

      // Verifica che l'aggiornamento abbia interessato il record atteso
      if (!data) {
        console.error('No rows affected when updating analysis with keywords:', {
          analysisId,
          context: 'updateAnalysisWithKeywords - expected 1 row affected but got 0'
        });
        return false;
      }

      console.log('Successfully updated analysis with keywords:', {
        analysisId,
        keywordsFound: keywordAnalysis.keywordsFound.length,
        keywordsMissing: keywordAnalysis.keywordsMissing.length,
        matchPercentage: keywordAnalysis.matchPercentage
      });
      
      return true;
    } catch (error) {
      console.error('Error updating analysis with keywords:', {
        analysisId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        context: 'updateAnalysisWithKeywords'
      });
      return false;
    }
  }

  /**
   * Processa un'analisi CV esistente per aggiungere i dati delle keyword
   */
  async processExistingAnalysis(
    analysis: CVAnalysis,
    cvText: string,
    options: KeywordExtractionOptions = {}
  ): Promise<KeywordAnalysisResult | null> {
    try {
      if (!analysis.job_description || !cvText || cvText.trim() === '') {
        console.warn('Missing job description or CV text for keyword analysis');
        return null;
      }

      const keywordAnalysis = this.analyzeKeywords(
        cvText,
        analysis.job_description,
        options
      );

      // Aggiorna l'analisi nel database
      const updateSuccess = await this.updateAnalysisWithKeywords(
        analysis.id,
        keywordAnalysis
      );

      if (!updateSuccess) {
        console.error('Failed to update analysis with keyword data');
        return null;
      }

      return keywordAnalysis;
    } catch (error) {
      console.error('Error processing existing analysis for keywords:', error);
      return null;
    }
  }
}

export const keywordAnalysisService = new KeywordAnalysisService();
export default keywordAnalysisService;