import React from 'react';
import { cn } from '../../utils/cn';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  CreditCardIcon,
  WifiIcon,
  DocumentTextIcon,
  UserIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export type ErrorType = 
  | 'validation' 
  | 'network' 
  | 'authentication' 
  | 'authorization' 
  | 'payment' 
  | 'file' 
  | 'server' 
  | 'generic';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ErrorMessageProps {
  type?: ErrorType;
  severity?: ErrorSeverity;
  title?: string;
  message: string;
  description?: string;
  actions?: ErrorAction[];
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
  animated?: boolean;
}

const errorIcons = {
  validation: DocumentTextIcon,
  network: WifiIcon,
  authentication: UserIcon,
  authorization: ShieldExclamationIcon,
  payment: CreditCardIcon,
  file: DocumentTextIcon,
  server: ExclamationTriangleIcon,
  generic: XCircleIcon,
};

const severityIcons = {
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type = 'generic',
  severity = 'error',
  title,
  message,
  description,
  actions,
  dismissible = false,
  onDismiss,
  className,
  showIcon = true,
  compact = false,
  animated = true,
}) => {
  const Icon = showIcon ? (errorIcons[type] || severityIcons[severity]) : null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && onDismiss) {
      onDismiss();
    }
  };

  const baseClasses = [
    'rounded-lg border transition-all duration-200',
    'focus-within:ring-2 focus-within:ring-offset-2',
  ];

  const severityClasses = {
    error: [
      'bg-red-50 dark:bg-red-900/10',
      'border-red-200 dark:border-red-800/50',
      'text-red-800 dark:text-red-200',
      'focus-within:ring-red-500',
    ],
    warning: [
      'bg-yellow-50 dark:bg-yellow-900/10',
      'border-yellow-200 dark:border-yellow-800/50',
      'text-yellow-800 dark:text-yellow-200',
      'focus-within:ring-yellow-500',
    ],
    info: [
      'bg-blue-50 dark:bg-blue-900/10',
      'border-blue-200 dark:border-blue-800/50',
      'text-blue-800 dark:text-blue-200',
      'focus-within:ring-blue-500',
    ],
  };

  const iconColorClasses = {
    error: 'text-red-500 dark:text-red-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    info: 'text-blue-500 dark:text-blue-400',
  };

  const sizeClasses = compact ? 'p-3 sm:p-3' : 'p-3 sm:p-4';
  const iconSizeClasses = compact ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-5 w-5 sm:h-6 sm:w-6';
  const textSizeClasses = compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base';

  const content = (
    <div
      className={cn(
        baseClasses,
        severityClasses[severity],
        sizeClasses,
        className
      )}
      role="alert"
      aria-live="polite"
      onKeyDown={handleKeyDown}
      tabIndex={dismissible ? 0 : -1}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {Icon && (
          <div className="flex-shrink-0 mt-0.5">
            <Icon 
              className={cn(
                iconSizeClasses,
                iconColorClasses[severity]
              )}
              aria-hidden="true"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={cn(
              'font-semibold mb-1',
              compact ? 'text-sm sm:text-sm' : 'text-sm sm:text-base'
            )}>
              {title}
            </h3>
          )}
          
          <p className={cn(
            'font-medium',
            textSizeClasses
          )}>
            {message}
          </p>
          
          {description && (
            <p className={cn(
              'mt-1 sm:mt-2 opacity-90',
              compact ? 'text-xs sm:text-xs' : 'text-xs sm:text-sm'
            )}>
              {description}
            </p>
          )}
          
          {actions && actions.length > 0 && (
            <div className={cn(
              'flex flex-wrap gap-1 sm:gap-2',
              compact ? 'mt-2' : 'mt-2 sm:mt-3'
            )}>
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    'inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-medium',
                    'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'touch-manipulation min-h-[32px] sm:min-h-[auto]',
                    action.variant === 'primary' ? [
                      severity === 'error' && 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
                      severity === 'warning' && 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
                      severity === 'info' && 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
                    ] : [
                      'bg-white dark:bg-gray-800 border border-current',
                      'hover:bg-gray-50 dark:hover:bg-gray-700',
                      'focus:ring-gray-500',
                    ]
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 p-1 sm:p-1 rounded-md transition-colors duration-200',
              'hover:bg-black/5 dark:hover:bg-white/5',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
              'touch-manipulation min-h-[32px] min-w-[32px] sm:min-h-[auto] sm:min-w-[auto]',
              'flex items-center justify-center'
            )}
            aria-label="Chiudi messaggio"
          >
            <svg className="h-4 w-4 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  if (!animated) {
    return content;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorMessage;