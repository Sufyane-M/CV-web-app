import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardFooter } from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

interface PDFUploaderProps {
  file: File | null;
  error: string | null;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  className?: string;
  disabled?: boolean;
  maxSizeBytes?: number;
  showPreview?: boolean;
}

interface PDFValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    hasValidHeader: boolean;
    hasValidSize: boolean;
    hasValidExtension: boolean;
  };
}

const PDFUploader: React.FC<PDFUploaderProps> = ({
  file,
  error,
  onFileSelect,
  onRemoveFile,
  className,
  disabled = false,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  showPreview = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Robust PDF validation with magic header check
  const validatePDFFile = useCallback(async (file: File): Promise<PDFValidationResult> => {
    try {
      // Extension check
      const hasValidExtension = /\.pdf$/i.test(file.name);
      
      // Size check  
      const hasValidSize = file.size > 0 && file.size <= maxSizeBytes;
      
      // Magic header check (reads first 8 bytes to verify PDF signature)
      const hasValidHeader = await new Promise<boolean>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            resolve(false);
            return;
          }
          
          const bytes = new Uint8Array(buffer);
          // PDF files start with "%PDF-" (0x25 0x50 0x44 0x46 0x2D)
          const isPDF = bytes.length >= 5 && 
                        bytes[0] === 0x25 && // %
                        bytes[1] === 0x50 && // P
                        bytes[2] === 0x44 && // D
                        bytes[3] === 0x46 && // F
                        bytes[4] === 0x2D;   // -
          
          resolve(isPDF);
        };
        reader.onerror = () => resolve(false);
        reader.readAsArrayBuffer(file.slice(0, 8));
      });

      const details = { hasValidHeader, hasValidSize, hasValidExtension };

      if (!hasValidExtension) {
        return {
          isValid: false,
          error: 'Il file deve avere estensione .pdf',
          details
        };
      }

      if (!hasValidSize) {
        if (file.size === 0) {
          return {
            isValid: false, 
            error: 'Il file è vuoto o corrotto',
            details
          };
        } else {
          return {
            isValid: false,
            error: `Il file è troppo grande. Massimo ${Math.round(maxSizeBytes / 1024 / 1024)}MB consentiti`,
            details
          };
        }
      }

      if (!hasValidHeader) {
        return {
          isValid: false,
          error: 'Il file non è un PDF valido (header non riconosciuto)',
          details
        };
      }

      return { isValid: true, details };

    } catch (error) {
      return {
        isValid: false,
        error: 'Errore durante la validazione del file',
        details: { hasValidHeader: false, hasValidSize: false, hasValidExtension: false }
      };
    }
  }, [maxSizeBytes]);

  // Generate PDF preview (first page as thumbnail)
  const generatePreview = useCallback(async (file: File) => {
    if (!showPreview) return;
    
    try {
      // For now, we'll use a placeholder icon
      // In the future, we could integrate PDF.js for actual thumbnails
      setPreviewDataUrl(null);
    } catch (error) {
      console.warn('Preview generation failed:', error);
      setPreviewDataUrl(null);
    }
  }, [showPreview]);

  // Handle file selection with validation
  const handleFileSelection = useCallback(async (selectedFile: File) => {
    if (disabled) return;

    setIsValidating(true);
    setLocalError(null);
    
    // Clear any existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    try {
      // Validate with timeout
      const validation = await Promise.race([
        validatePDFFile(selectedFile),
        new Promise<PDFValidationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 8000)
        )
      ]);

      if (validation.isValid) {
        onFileSelect(selectedFile);
        await generatePreview(selectedFile);
      } else {
        setLocalError(validation.error || 'File non valido');
      }
    } catch (error: any) {
      console.error('PDF validation error:', error);
      setLocalError(error?.message || 'File non valido');
    } finally {
      setIsValidating(false);
    }
  }, [disabled, validatePDFFile, onFileSelect, generatePreview]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const dt = e.dataTransfer;
    let selectedFile: File | null = null;

    // Try multiple ways to get the file
    if (dt.files && dt.files.length > 0) {
      selectedFile = dt.files[0];
    } else if (dt.items && dt.items.length > 0) {
      const fileItems = Array.from(dt.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null);
      selectedFile = fileItems[0] || null;
    }

    if (selectedFile) {
      try {
        await handleFileSelection(selectedFile);
      } catch (error: any) {
        // Error handling will be done locally
        console.error('Drop file selection failed:', error);
      }
    }

    // Clean up
    try {
      if (dt.items) dt.items.clear();
      dt.clearData();
    } catch (e) {
      // Ignore cleanup errors
    }
  }, [disabled, handleFileSelection]);

  // File input handler
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      try {
        await handleFileSelection(selectedFile);
      } catch (error: any) {
        // Error handling will be done locally
        console.error('Input file selection failed:', error);
      }
    }
  }, [handleFileSelection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Reset preview when file changes
  useEffect(() => {
    if (!file) {
      setPreviewDataUrl(null);
    }
  }, [file]);

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const displayError = error ?? localError;

  // Simple preview: open the PDF in a new browser tab
  const openPreview = useCallback(() => {
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Revoke after a short delay to allow loading in the new tab
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.warn('Impossibile aprire l\'anteprima del PDF:', e);
    }
  }, [file]);

  return (
    <Card variant="default" padding="lg" hover className={cn('relative', className)}>
      <CardHeader
        title="Allega il tuo CV"
        subtitle={`Solo file PDF • Massimo ${Math.round(maxSizeBytes / 1024 / 1024)}MB`}
      />
      <CardContent spacing="md">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Drop zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => { if (!disabled && !file) openFileDialog(); }}
          onKeyDown={(e) => { if (!disabled && !file && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openFileDialog(); } }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={cn(
            'relative rounded-lg border-2 border-dashed transition-all duration-200',
            isDragging && !disabled
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 ring-2 ring-primary-300/60 dark:ring-primary-700/50'
              : 'border-gray-300 dark:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer',
            !disabled && !file && 'hover:border-primary-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
          )}
        >
          {!file ? (
            // Upload state
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
                isDragging && !disabled
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              )}>
                <Upload className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {isValidating ? 'Validazione in corso...' : 'Carica il tuo CV'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Trascina qui il tuo file PDF oppure{' '}
                <button
                  type="button"
                  onClick={openFileDialog}
                  disabled={disabled || isValidating}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  clicca per selezionarlo
                </button>
              </p>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Solo file PDF • Massimo {Math.round(maxSizeBytes / 1024 / 1024)}MB
              </div>
            </div>
          ) : (
            // File selected state
            <div className="flex items-start gap-4 py-4 px-4 sm:px-6">
              <div className="flex-shrink-0">
                {previewDataUrl ? (
                  <img 
                    src={previewDataUrl} 
                    alt="Anteprima PDF" 
                    className="w-16 h-20 object-cover rounded border"
                  />
                ) : (
                  <div className="w-16 h-20 bg-red-50 dark:bg-red-900/20 rounded border flex items-center justify-center">
                    <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </h4>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="primary" size="sm">PDF</Badge>
                  <Badge variant="secondary" size="sm">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openFileDialog}
                    disabled={disabled}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Cambia file
                  </Button>
                  
                  {showPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openPreview}
                      disabled={disabled || !file}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Anteprima
                    </Button>
                  )}
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => { setLocalError(null); onRemoveFile(); }}
                disabled={disabled}
                aria-label="Rimuovi file"
                title="Rimuovi file"
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {displayError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
            </div>
          </div>
        )}

        {/* Validation progress */}
        {isValidating && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Validazione PDF in corso...
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter justify="between" className="pt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          I tuoi file sono elaborati in modo sicuro e non vengono conservati.
        </p>
      </CardFooter>
    </Card>
  );
};

export default PDFUploader;