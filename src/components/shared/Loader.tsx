
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-lg font-semibold text-slate-300">Analisi in corso...</p>
      <p className="text-slate-400">Potrebbe richiedere qualche secondo.</p>
    </div>
  );
};

export default Loader;
