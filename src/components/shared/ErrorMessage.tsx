
import React from 'react';
import { ErrorIcon } from './icons/ErrorIcon';

interface ErrorMessageProps {
  message: string;
  onReset: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onReset }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-6 animate-fade-in">
        <ErrorIcon className="w-16 h-16 text-red-500" />
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-red-400">Oops! Qualcosa è andato storto.</h2>
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                <p className="text-red-300">{message}</p>
            </div>
        </div>
      <button
        onClick={onReset}
        className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-red-500/50"
      >
        Riprova
      </button>
    </div>
  );
};

export default ErrorMessage;
