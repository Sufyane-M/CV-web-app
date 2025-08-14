import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type NotificationSize = 'sm' | 'md' | 'lg';
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface UnifiedNotificationProps {
  type: NotificationType;
  title?: string;
  message: string;
  size?: NotificationSize;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  autoHide?: boolean;
  duration?: number;
  showIcon?: boolean;
  variant?: 'filled' | 'outlined' | 'minimal';
}

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  loading: Loader2,
};

const UnifiedNotification = forwardRef<HTMLDivElement, UnifiedNotificationProps>(
  (
    {
      type,
      title,
      message,
      size = 'md',
      dismissible = true,
      onDismiss,
      action,
      className,
      showIcon = true,
      variant = 'filled',
      ...props
    },
    ref
  ) => {
    const Icon = iconMap[type];

    // Base classes for consistent styling
    const baseClasses = [
      'relative flex items-start gap-3 p-4 rounded-lg',
      'border transition-all duration-300 ease-in-out',
      'shadow-sm backdrop-blur-sm',
      'focus-within:ring-2 focus-within:ring-offset-2',
    ];

    // Size variations
    const sizeClasses = {
      sm: 'p-3 text-sm gap-2',
      md: 'p-4 text-sm gap-3',
      lg: 'p-5 text-base gap-4',
    };

    // Type-based styling with variant support
    const getTypeClasses = (type: NotificationType, variant: string) => {
      const variants = {
        filled: {
          success: [
            'bg-green-50 dark:bg-green-900/20',
            'border-green-200 dark:border-green-800',
            'text-green-800 dark:text-green-200',
            'focus-within:ring-green-500',
          ],
          error: [
            'bg-red-50 dark:bg-red-900/20',
            'border-red-200 dark:border-red-800',
            'text-red-800 dark:text-red-200',
            'focus-within:ring-red-500',
          ],
          warning: [
            'bg-yellow-50 dark:bg-yellow-900/20',
            'border-yellow-200 dark:border-yellow-800',
            'text-yellow-800 dark:text-yellow-200',
            'focus-within:ring-yellow-500',
          ],
          info: [
            'bg-blue-50 dark:bg-blue-900/20',
            'border-blue-200 dark:border-blue-800',
            'text-blue-800 dark:text-blue-200',
            'focus-within:ring-blue-500',
          ],
          loading: [
            'bg-gray-50 dark:bg-gray-900/20',
            'border-gray-200 dark:border-gray-800',
            'text-gray-800 dark:text-gray-200',
            'focus-within:ring-gray-500',
          ],
        },
        outlined: {
          success: [
            'bg-white dark:bg-gray-900',
            'border-green-300 dark:border-green-700',
            'text-green-700 dark:text-green-300',
            'focus-within:ring-green-500',
          ],
          error: [
            'bg-white dark:bg-gray-900',
            'border-red-300 dark:border-red-700',
            'text-red-700 dark:text-red-300',
            'focus-within:ring-red-500',
          ],
          warning: [
            'bg-white dark:bg-gray-900',
            'border-yellow-300 dark:border-yellow-700',
            'text-yellow-700 dark:text-yellow-300',
            'focus-within:ring-yellow-500',
          ],
          info: [
            'bg-white dark:bg-gray-900',
            'border-blue-300 dark:border-blue-700',
            'text-blue-700 dark:text-blue-300',
            'focus-within:ring-blue-500',
          ],
          loading: [
            'bg-white dark:bg-gray-900',
            'border-gray-300 dark:border-gray-700',
            'text-gray-700 dark:text-gray-300',
            'focus-within:ring-gray-500',
          ],
        },
        minimal: {
          success: [
            'bg-transparent',
            'border-transparent border-l-4 border-l-green-500',
            'text-green-700 dark:text-green-300',
            'focus-within:ring-green-500',
          ],
          error: [
            'bg-transparent',
            'border-transparent border-l-4 border-l-red-500',
            'text-red-700 dark:text-red-300',
            'focus-within:ring-red-500',
          ],
          warning: [
            'bg-transparent',
            'border-transparent border-l-4 border-l-yellow-500',
            'text-yellow-700 dark:text-yellow-300',
            'focus-within:ring-yellow-500',
          ],
          info: [
            'bg-transparent',
            'border-transparent border-l-4 border-l-blue-500',
            'text-blue-700 dark:text-blue-300',
            'focus-within:ring-blue-500',
          ],
          loading: [
            'bg-transparent',
            'border-transparent border-l-4 border-l-gray-500',
            'text-gray-700 dark:text-gray-300',
            'focus-within:ring-gray-500',
          ],
        },
      };

      return variants[variant as keyof typeof variants]?.[type] || variants.filled[type];
    };

    // Icon color classes
    const getIconClasses = (type: NotificationType) => {
      const iconClasses = {
        success: 'text-green-500 dark:text-green-400',
        error: 'text-red-500 dark:text-red-400',
        warning: 'text-yellow-500 dark:text-yellow-400',
        info: 'text-blue-500 dark:text-blue-400',
        loading: 'text-gray-500 dark:text-gray-400',
      };
      return iconClasses[type];
    };

    const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          getTypeClasses(type, variant),
          className
        )}
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        {...props}
      >
        {/* Icon */}
        {showIcon && Icon && (
          <div className="flex-shrink-0 mt-0.5">
            {type === 'loading' ? (
              <Icon className={cn(iconSize, getIconClasses(type), 'animate-spin')} />
            ) : (
              <Icon className={cn(iconSize, getIconClasses(type))} />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold mb-1 text-current">
              {title}
            </h4>
          )}
          <p className="text-current opacity-90 leading-relaxed">
            {message}
          </p>
          
          {/* Action button */}
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'mt-2 text-sm font-medium underline',
                'hover:no-underline focus:outline-none focus:ring-2',
                'focus:ring-offset-2 rounded transition-colors',
                type === 'success' && 'text-green-700 dark:text-green-300 focus:ring-green-500',
                type === 'error' && 'text-red-700 dark:text-red-300 focus:ring-red-500',
                type === 'warning' && 'text-yellow-700 dark:text-yellow-300 focus:ring-yellow-500',
                type === 'info' && 'text-blue-700 dark:text-blue-300 focus:ring-blue-500',
                type === 'loading' && 'text-gray-700 dark:text-gray-300 focus:ring-gray-500'
              )}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded-md transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/5',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              type === 'success' && 'text-green-500 focus:ring-green-500',
              type === 'error' && 'text-red-500 focus:ring-red-500',
              type === 'warning' && 'text-yellow-500 focus:ring-yellow-500',
              type === 'info' && 'text-blue-500 focus:ring-blue-500',
              type === 'loading' && 'text-gray-500 focus:ring-gray-500'
            )}
            aria-label="Chiudi notifica"
          >
            <XMarkIcon className={iconSize} />
          </button>
        )}
      </div>
    );
  }
);

UnifiedNotification.displayName = 'UnifiedNotification';

export default UnifiedNotification;