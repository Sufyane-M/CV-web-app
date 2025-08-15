import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
interface AnalysisDraftData {
  file: File | null;
  jobDescription: string;
}

interface AnalysisDraftContextType {
  // State
  draftData: AnalysisDraftData;
  
  // Actions
  setFile: (file: File | null) => void;
  setJobDescription: (description: string) => void;
  clearDraft: () => void;
  
  // Helpers
  hasDraft: boolean;
}

// Initial state
const initialDraftData: AnalysisDraftData = {
  file: null,
  jobDescription: '',
};

// Create context
const AnalysisDraftContext = createContext<AnalysisDraftContextType | undefined>(undefined);

// Custom hook to use the context
export const useAnalysisDraft = () => {
  const context = useContext(AnalysisDraftContext);
  if (context === undefined) {
    throw new Error('useAnalysisDraft must be used within an AnalysisDraftProvider');
  }
  return context;
};

// Provider component
interface AnalysisDraftProviderProps {
  children: ReactNode;
}

export const AnalysisDraftProvider: React.FC<AnalysisDraftProviderProps> = ({ children }) => {
  const [draftData, setDraftData] = useState<AnalysisDraftData>(initialDraftData);

  // Action to set file
  const setFile = useCallback((file: File | null) => {
    setDraftData(prev => ({
      ...prev,
      file,
    }));
  }, []);

  // Action to set job description
  const setJobDescription = useCallback((description: string) => {
    setDraftData(prev => ({
      ...prev,
      jobDescription: description,
    }));
  }, []);

  // Action to clear all draft data
  const clearDraft = useCallback(() => {
    setDraftData(initialDraftData);
  }, []);

  // Helper to check if there's any draft data
  const hasDraft = draftData.file !== null || draftData.jobDescription.trim() !== '';

  const value: AnalysisDraftContextType = {
    draftData,
    setFile,
    setJobDescription,
    clearDraft,
    hasDraft,
  };

  return (
    <AnalysisDraftContext.Provider value={value}>
      {children}
    </AnalysisDraftContext.Provider>
  );
};

export default AnalysisDraftContext;