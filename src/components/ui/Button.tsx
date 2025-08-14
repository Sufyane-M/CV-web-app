import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-lg',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'relative overflow-hidden',
    ];

    const variantClasses = {
      primary: [
        'bg-primary-600 text-white',
        'hover:bg-primary-700 active:bg-primary-800',
        'focus:ring-primary-500',
        'shadow-sm hover:shadow-md',
      ],
      secondary: [
        'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
        'hover:bg-gray-200 dark:hover:bg-gray-600',
        'active:bg-gray-300 dark:active:bg-gray-500',
        'focus:ring-gray-500',
        'border border-gray-300 dark:border-gray-600',
      ],
      danger: [
        'bg-red-600 text-white',
        'hover:bg-red-700 active:bg-red-800',
        'focus:ring-red-500',
        'shadow-sm hover:shadow-md',
      ],
      ghost: [
        'text-gray-700 dark:text-gray-300',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'active:bg-gray-200 dark:active:bg-gray-700',
        'focus:ring-gray-500',
      ],
      outline: [
        'border border-gray-300 dark:border-gray-600',
        'text-gray-700 dark:text-gray-300',
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        'active:bg-gray-100 dark:active:bg-gray-700',
        'focus:ring-gray-500',
      ],
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    const widthClasses = fullWidth ? 'w-full' : '';

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses,
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        )}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children && (
          <span className={cn('truncate', loading && 'opacity-70')}>
            {children}
          </span>
        )}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;