
import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  jobDescription: string;
  onJobDescriptionChange: (description: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ file, onFileChange, onUpload, jobDescription, onJobDescriptionChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };
  
  const removeFile = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onFileChange(null);
  }, [onFileChange]);

  return (
    <div className="flex flex-col items-center space-y-6">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileSelect}
        accept=".pdf"
        className="hidden"
        aria-label="File Upload"
      />
      
      {!file ? (
        <div
          onClick={openFileDialog}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          className={`w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
            isDragging ? 'border-blue-500 bg-slate-700/50' : 'border-slate-600 hover:border-blue-600 hover:bg-slate-700/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-slate-400">
            <UploadIcon className="w-12 h-12" />
            <p className="text-lg font-semibold text-slate-300">Trascina qui il tuo CV in PDF</p>
            <p>o</p>
            <p className="text-blue-400 font-medium">Seleziona un file dal computer</p>
          </div>
        </div>
      ) : (
        <div className="w-full p-4 border border-slate-600 bg-slate-700/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
                <DocumentIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                <div className="flex flex-col overflow-hidden">
                    <span className="font-medium text-slate-200 truncate">{file.name}</span>
                    <span className="text-sm text-slate-400">{Math.round(file.size / 1024)} KB</span>
                </div>
            </div>
            <button onClick={removeFile} aria-label="Rimuovi file" className="p-2 rounded-full hover:bg-slate-600 transition-colors">
                <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-400" />
            </button>
        </div>
      )}

      <div className="w-full space-y-2">
        <label htmlFor="job-description" className="block text-sm font-medium text-slate-300">
          Descrizione dell'offerta di lavoro (opzionale)
        </label>
        <textarea
          id="job-description"
          rows={5}
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Copia e incolla qui la descrizione del lavoro per un'analisi più accurata..."
          className="w-full p-3 bg-slate-900/70 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 resize-y placeholder-slate-500"
          aria-label="Descrizione dell'offerta di lavoro"
        />
      </div>

      <button
        onClick={onUpload}
        disabled={!file}
        className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transform hover:scale-105 disabled:scale-100"
      >
        Analizza il CV
      </button>
    </div>
  );
};

export default FileUpload;
