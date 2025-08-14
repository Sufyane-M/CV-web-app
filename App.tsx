import React, { useState, useCallback } from 'react';
import { UPLOAD_URL } from './constants';
import type { AnalysisResult } from './types';
import FileUpload from './components/FileUpload';
import JsonResponseDisplay from './components/JsonResponseDisplay';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [response, setResponse] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setResponse(null);
    setError(null);
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError("Nessun file selezionato. Per favore, scegli un file PDF.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'jobDescription', 
      jobDescription.trim() === '' 
        ? "L'utente non ha inserito, la descrizione dell'offerta di lavoro, procedere all'analisi senza" 
        : jobDescription
    );

    try {
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      const responseBodyText = await res.text();

      if (!res.ok) {
        throw new Error(`Errore del server: ${res.status} - ${responseBodyText || res.statusText}`);
      }

      if (!responseBodyText) {
        throw new Error("La risposta dal server è vuota. Assicurati che il server restituisca un JSON valido.");
      }
    
      let parsedJson: any;
      try {
          parsedJson = JSON.parse(responseBodyText);
      } catch (parseError) {
          console.error("Testo della risposta non valido:", responseBodyText);
          throw new Error("Impossibile analizzare la risposta del server. Il formato JSON non è valido.");
      }
      
      // Il server può restituire dati in varie strutture.
      // Questa funzione cerca di trovare l'oggetto di analisi corretto.
      const findResultData = (data: any): AnalysisResult | null => {
        if (!data) return null;

        // Caso: l'oggetto è annidato in una chiave 'output'
        if (data.output && data.output.executiveSummary && data.output.matchAnalysis) {
            return data.output as AnalysisResult;
        }
        // Caso 1: L'oggetto è quello corretto (alla radice)
        if (data.executiveSummary && data.matchAnalysis) {
            return data as AnalysisResult;
        }
        // Caso 2: L'oggetto è annidato in una chiave 'json'
        if (data.json && data.json.executiveSummary && data.json.matchAnalysis) {
            return data.json as AnalysisResult;
        }
        // Caso 3: L'oggetto è annidato in una chiave 'data'
        if (data.data && data.data.executiveSummary && data.data.matchAnalysis) {
            return data.data as AnalysisResult;
        }
        
        return null;
      }

      // Alcuni server restituiscono un array. Se la risposta è un array prendiamo il primo elemento.
      const itemToProcess = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;

      const resultData = findResultData(itemToProcess);

      if (resultData) {
        setResponse(resultData);
      } else {
        console.error("JSON di risposta non valido o struttura inattesa:", parsedJson);
        throw new Error("La risposta JSON del server non ha la struttura attesa. Mancano 'executiveSummary' o 'matchAnalysis'. Assicurati che il webhook restituisca i dati direttamente o dentro una chiave 'output', 'json' o 'data'.");
      }

      setFile(null); // Reset file input after successful upload

    } catch (err) {
      if (err instanceof Error) {
        setError(`Si è verificato un errore durante l'upload: ${err.message}`);
      } else {
        setError('Si è verificato un errore sconosciuto.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [file, jobDescription]);

  const handleReset = () => {
    setFile(null);
    setResponse(null);
    setError(null);
    setIsLoading(false);
    setJobDescription('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl bg-slate-800/50 rounded-2xl shadow-2xl shadow-slate-950/50 backdrop-blur-sm border border-slate-700/50 overflow-hidden">
          <div className="p-6 md:p-8">
            {isLoading ? (
              <Loader />
            ) : error ? (
              <ErrorMessage message={error} onReset={handleReset} />
            ) : response ? (
              <JsonResponseDisplay data={response} onReset={handleReset} />
            ) : (
              <FileUpload 
                file={file} 
                onFileChange={handleFileChange} 
                onUpload={handleUpload}
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;