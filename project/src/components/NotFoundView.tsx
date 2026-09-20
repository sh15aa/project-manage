import React from 'react';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

interface NotFoundViewProps {
  onGoHome: () => void;
  title?: string;
  message?: string;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onGoHome,
  title = 'Page Not Found',
  message = "The project or section you're looking for doesn't exist or may have been moved.",
}) => {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4 shadow-lg shadow-amber-500/10">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-xs text-slate-400 leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          <Home className="h-4 w-4" />
          Back to Projects
        </button>
      </div>
    </div>
  );
};
