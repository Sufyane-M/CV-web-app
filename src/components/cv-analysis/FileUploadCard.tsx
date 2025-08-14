import React from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Cloud,
  Sparkles,
  Shield
} from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';

interface FileUploadCardProps {
  file: File | null;
  isDragging: boolean;
  error: string | null;
  onFileSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({
  file,
  isDragging,
  error,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  fileInputRef,
  onFileInputChange
}) => {
  return (
    <Card className="mb-6 overflow-hidden" variant="elevated" padding="none">
      {/* Header con gradiente e icona animata */}
      <CardHeader className="bg-gradient-to-r from-primary-500 via-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
              <div className="relative bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Carica il tuo CV
              </h2>
              <p className="text-white/80 text-sm flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Solo file PDF • Massimo 10MB • Sicuro e privato</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-white/60">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">AI Ready</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {!file ? (
          <div
            role="button"
            tabIndex={0}
            aria-label="Area di caricamento CV"
            className={cn(
              "relative group cursor-pointer transition-all duration-300 ease-out",
              "border-2 border-dashed rounded-2xl p-8 sm:p-12",
              "focus:outline-none focus:ring-4 focus:ring-primary-500/20",
              "hover:scale-[1.01] hover:shadow-lg",
              isDragging
                ? "border-primary-500 bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 dark:from-primary-900/30 dark:via-blue-900/20 dark:to-purple-900/20 ring-2 ring-primary-400/50 scale-[1.02] shadow-xl"
                : "border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-primary-50/30 dark:hover:from-gray-800/50 dark:hover:to-primary-900/20"
            )}
            onClick={onFileSelect}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFileSelect();
              }
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Sfondo animato */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Contenuto centrale */}
            <div className="relative text-center">
              {/* Icona principale con animazioni */}
              <div className="relative mx-auto mb-6">
                <div className={cn(
                  "relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500",
                  "bg-gradient-to-br from-primary-100 via-blue-100 to-purple-100",
                  "dark:from-primary-900/30 dark:via-blue-900/30 dark:to-purple-900/30",
                  "border-2 border-primary-200/50 dark:border-primary-800/40",
                  "shadow-lg group-hover:shadow-xl",
                  isDragging ? "scale-110 rotate-6" : "group-hover:scale-105 group-hover:-rotate-3"
                )}>
                  {/* Effetto glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400/20 to-purple-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Icone animate */}
                  <div className="relative">
                    <Upload className={cn(
                      "h-10 w-10 transition-all duration-300",
                      isDragging 
                        ? "text-primary-600 dark:text-primary-400 animate-bounce" 
                        : "text-primary-500 dark:text-primary-400 group-hover:text-primary-600 dark:group-hover:text-primary-300"
                    )} />
                    <Cloud className={cn(
                      "absolute -top-2 -right-2 h-5 w-5 transition-all duration-500",
                      "text-blue-400 opacity-0 group-hover:opacity-100 group-hover:animate-pulse"
                    )} />
                  </div>
                </div>
              </div>

              {/* Testo principale */}
              <div className="space-y-3 mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                  {isDragging ? (
                    <span className="text-primary-600 dark:text-primary-400 animate-pulse">
                      Rilascia il file qui! 🎯
                    </span>
                  ) : (
                    "Trascina e rilascia il tuo CV"
                  )}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                  Oppure clicca per selezionare un file dal tuo dispositivo
                </p>
              </div>

              {/* Pulsante di selezione */}
              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onFileSelect}
                  leftIcon={<FileText className="h-5 w-5" />}
                  className={cn(
                    "group/button relative overflow-hidden",
                    "border-2 border-primary-200 dark:border-primary-800",
                    "hover:border-primary-400 dark:hover:border-primary-600",
                    "hover:bg-primary-50 dark:hover:bg-primary-900/20",
                    "hover:text-primary-700 dark:hover:text-primary-300",
                    "transform hover:scale-105 transition-all duration-200",
                    "shadow-md hover:shadow-lg"
                  )}
                >
                  <span className="relative z-10">Seleziona File PDF</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-blue-500/10 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
                </Button>

                {/* Informazioni aggiuntive */}
                <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Drag & Drop</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Solo PDF</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span>Max 10MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input file: visivamente nascosto (sr-only) anziché display:none per affidabilità su mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFileInputChange}
              className="sr-only"
              aria-label="Seleziona file CV"
            />
          </div>
        ) : (
          /* File caricato con successo */
          <div className="relative">
            <div className="rounded-2xl border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-green-900/20 p-6 shadow-lg">
              {/* Effetto di successo */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-2xl animate-pulse"></div>
              
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Icona di successo animata */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
                    <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800 flex items-center justify-center border-2 border-green-200 dark:border-green-700 shadow-md">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 animate-bounce" />
                    </div>
                  </div>
                  
                  {/* Informazioni file */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                        File caricato con successo!
                      </h4>
                      <Sparkles className="h-4 w-4 text-green-500 animate-pulse" />
                    </div>
                    <p className="font-medium text-green-800 dark:text-green-200 break-all mb-1">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-green-700 dark:text-green-300">
                      <span className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Sicuro</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Pulsante rimozione */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveFile}
                  leftIcon={<X className="h-4 w-4" />}
                  className={cn(
                    "shrink-0 text-green-700 dark:text-green-300",
                    "hover:text-red-600 dark:hover:text-red-400",
                    "hover:bg-red-50 dark:hover:bg-red-900/20",
                    "transition-all duration-200 transform hover:scale-105"
                  )}
                >
                  Rimuovi
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Messaggio di errore */}
        {error && (
          <div className="mt-6 relative">
            <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 via-pink-50 to-red-50 dark:from-red-900/20 dark:via-pink-900/10 dark:to-red-900/20 p-4 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-pink-400/10 rounded-xl animate-pulse"></div>
              <div className="relative flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center border-2 border-red-200 dark:border-red-700">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Errore nel caricamento
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploadCard;