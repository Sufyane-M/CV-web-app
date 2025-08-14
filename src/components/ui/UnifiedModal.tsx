import React, { useEffect, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from './Button';

export type ModalVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  variant?: ModalVariant;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  showIcon?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
}

export interface UnifiedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  loading?: boolean;
  size?: ModalSize;
  showIcon?: boolean;
}

const variantIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const UnifiedModal = forwardRef<HTMLDivElement, UnifiedModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      size = 'md',
      variant = 'default',
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      showIcon = false,
      children,
      footer,
      className,
      overlayClassName,
      contentClassName,
      ...props
    },
    ref
  ) => {
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

    // Handle focus management and body scroll
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

    // Size classes
    const sizeClasses = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-2xl',
      full: 'max-w-full mx-4',
    };

    // Variant classes for header styling
    const getVariantClasses = (variant: ModalVariant) => {
      const variants = {
        default: {
          header: 'border-gray-200 dark:border-gray-700',
          icon: 'text-gray-500 dark:text-gray-400',
        },
        success: {
          header: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20',
          icon: 'text-green-500 dark:text-green-400',
        },
        error: {
          header: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20',
          icon: 'text-red-500 dark:text-red-400',
        },
        warning: {
          header: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20',
          icon: 'text-yellow-500 dark:text-yellow-400',
        },
        info: {
          header: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20',
          icon: 'text-blue-500 dark:text-blue-400',
        },
      };
      return variants[variant];
    };

    const variantClasses = getVariantClasses(variant);
    const VariantIcon = variant !== 'default' ? variantIcons[variant as keyof typeof variantIcons] : null;

    if (!isOpen) return null;

    const modalContent = (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          'animate-fade-in',
          overlayClassName
        )}
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        
        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            'relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
            'transform transition-all duration-300 ease-out',
            'animate-slide-up border border-gray-200 dark:border-gray-700',
            sizeClasses[size],
            contentClassName,
            className
          )}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton || (showIcon && VariantIcon)) && (
            <div className={cn(
              'flex items-center gap-3 p-6 border-b',
              variantClasses.header
            )}>
              {/* Icon */}
              {showIcon && VariantIcon && (
                <div className="flex-shrink-0">
                  <VariantIcon className={cn('h-6 w-6', variantClasses.icon)} />
                </div>
              )}
              
              {/* Title and Description */}
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
                    className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2"
                  >
                    {description}
                  </p>
                )}
              </div>
              
              {/* Close Button */}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Chiudi modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

UnifiedModal.displayName = 'UnifiedModal';

// Unified Confirm Modal Component
export const UnifiedConfirmModal: React.FC<UnifiedConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'warning',
  loading = false,
  size = 'sm',
  showIcon = true,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const getButtonVariant = (variant: string) => {
    const buttonVariants = {
      success: 'primary',
      error: 'danger',
      warning: 'primary',
      info: 'primary',
    };
    return buttonVariants[variant as keyof typeof buttonVariants] || 'primary';
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      variant={variant}
      showIcon={showIcon}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="min-w-[80px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={getButtonVariant(variant) as any}
            onClick={handleConfirm}
            loading={loading}
            className="min-w-[80px]"
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
        {message}
      </p>
    </UnifiedModal>
  );
};

export default UnifiedModal;