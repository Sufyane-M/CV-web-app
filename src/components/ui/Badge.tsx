import React from 'react';
import { cn } from '../../utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  rounded = false,
  removable = false,
  onRemove,
  leftIcon,
  rightIcon,
  children,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center font-medium',
    'transition-colors duration-200',
    rounded ? 'rounded-full' : 'rounded-md',
  ];

  const variantClasses = {
    default: [
      'bg-gray-100 text-gray-800',
      'dark:bg-gray-700 dark:text-gray-300',
    ],
    primary: [
      'bg-primary-100 text-primary-800',
      'dark:bg-primary-900/30 dark:text-primary-300',
    ],
    secondary: [
      'bg-gray-100 text-gray-600',
      'dark:bg-gray-700 dark:text-gray-400',
    ],
    success: [
      'bg-green-100 text-green-800',
      'dark:bg-green-900/30 dark:text-green-300',
    ],
    warning: [
      'bg-yellow-100 text-yellow-800',
      'dark:bg-yellow-900/30 dark:text-yellow-300',
    ],
    danger: [
      'bg-red-100 text-red-800',
      'dark:bg-red-900/30 dark:text-red-300',
    ],
    info: [
      'bg-blue-100 text-blue-800',
      'dark:bg-blue-900/30 dark:text-blue-300',
    ],
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-0.5 text-sm gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {leftIcon && (
        <span className={cn('flex-shrink-0', iconSizeClasses[size])}>
          {leftIcon}
        </span>
      )}
      
      {children && (
        <span className="truncate">{children}</span>
      )}
      
      {rightIcon && !removable && (
        <span className={cn('flex-shrink-0', iconSizeClasses[size])}>
          {rightIcon}
        </span>
      )}
      
      {removable && (
        <button
          type="button"
          className={cn(
            'flex-shrink-0 ml-1 rounded-full',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'transition-colors duration-200',
            iconSizeClasses[size]
          )}
          onClick={onRemove}
          aria-label="Rimuovi badge"
        >
          <XMarkIcon className={iconSizeClasses[size]} />
        </button>
      )}
    </span>
  );
};

// Status Badge Component
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'processing' | 'completed' | 'failed';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  ...props
}) => {
  const statusConfig = {
    processing: {
      variant: 'info' as const,
      text: 'In elaborazione',
    },
    completed: {
      variant: 'success' as const,
      text: 'Completato',
    },
    failed: {
      variant: 'danger' as const,
      text: 'Fallito',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} {...props}>
      {config.text}
    </Badge>
  );
};



// Score Badge Component
export interface ScoreBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  score: number;
  maxScore?: number;
  showPercentage?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  maxScore = 100,
  showPercentage = true,
  ...props
}) => {
  const percentage = (score / maxScore) * 100;
  
  const getVariant = (percentage: number): BadgeProps['variant'] => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    if (percentage >= 40) return 'info';
    return 'danger';
  };

  const variant = getVariant(percentage);
  const displayValue = showPercentage ? `${Math.round(percentage)}%` : score.toString();

  return (
    <Badge variant={variant} {...props}>
      {displayValue}
    </Badge>
  );
};

// Credit Badge Component
export interface CreditBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  credits: number;
  showIcon?: boolean;
}

export const CreditBadge: React.FC<CreditBadgeProps> = ({
  credits,
  showIcon = true,
  ...props
}) => {
  const getVariant = (credits: number): BadgeProps['variant'] => {
    if (credits >= 5) return 'success';
    if (credits >= 2) return 'warning';
    if (credits >= 1) return 'info';
    return 'danger';
  };

  const variant = getVariant(credits);

  return (
    <Badge
      variant={variant}
      leftIcon={
        showIcon ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
          </svg>
        ) : undefined
      }
      {...props}
    >
      {credits} {credits === 1 ? 'credito' : 'crediti'}
    </Badge>
  );
};

export default Badge;