import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Button from './Button';
import { ErrorMessage } from './ErrorMessage';
import { ErrorMessageConfig } from '../../utils/errorMessages';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  children,
  footer,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl',
          'transform transition-all duration-200 ease-out',
          'animate-fade-in',
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-4 p-2"
                aria-label="Chiudi modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Confirmation Modal Component
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  error?: string | ErrorMessageConfig;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Conferma azione',
  message = 'Sei sicuro di voler procedere?',
  error,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'info',
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-center space-x-3">
        {variant === 'danger' && (
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
        )}
        {variant === 'warning' && (
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
          </div>
        )}
        {variant === 'info' && (
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-6 w-6 text-blue-600" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>
          {error && (
            <div className="mt-3">
              {typeof error === 'string' ? (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded-md">
                  {error}
                </div>
              ) : (
                <ErrorMessage 
                  config={error} 
                  size="sm"
                  variant="minimal"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default Modal;