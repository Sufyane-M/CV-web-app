import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      inputSize = 'md',
      fullWidth = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const baseClasses = [
      'block w-full rounded-lg border transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    ];

    const variantClasses = {
      default: [
        'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800',
        'text-gray-900 dark:text-gray-100',
        'focus:border-primary-500 focus:ring-primary-500',
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
          : 'hover:border-gray-400 dark:hover:border-gray-500',
      ],
      filled: [
        'border-transparent',
        'bg-gray-100 dark:bg-gray-700',
        'text-gray-900 dark:text-gray-100',
        'focus:bg-white dark:focus:bg-gray-800',
        'focus:border-primary-500 focus:ring-primary-500',
        error
          ? 'bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-red-500'
          : 'hover:bg-gray-200 dark:hover:bg-gray-600',
      ],
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const iconSizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    const paddingWithIcons = cn(
      sizeClasses[inputSize],
      leftIcon && 'pl-10',
      (rightIcon || isPassword) && 'pr-10'
    );

    const widthClasses = fullWidth ? 'w-full' : '';

    return (
      <div className={cn('relative', widthClasses)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className={cn('text-gray-400 dark:text-gray-500', iconSizeClasses[inputSize])}>
                {leftIcon}
              </span>
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            className={cn(
              baseClasses,
              variantClasses[variant],
              paddingWithIcons,
              className
            )}
            disabled={disabled}
            {...props}
          />
          
          {(rightIcon || isPassword || (hasError && showErrorIcon)) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
              {hasError && showErrorIcon && (
                <ExclamationCircleIcon 
                  className={cn(
                    'text-red-500 dark:text-red-400',
                    iconSizeClasses[inputSize]
                  )}
                  aria-hidden="true"
                />
              )}
              {isPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                    'focus:outline-none focus:text-gray-600 dark:focus:text-gray-300',
                    iconSizeClasses[inputSize]
                  )}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className={iconSizeClasses[inputSize]} />
                  ) : (
                    <EyeIcon className={iconSizeClasses[inputSize]} />
                  )}
                </button>
              ) : rightIcon ? (
                <span className={cn('text-gray-400 dark:text-gray-500', iconSizeClasses[inputSize])}>
                  {rightIcon}
                </span>
              ) : null}
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-2">
            {isErrorObject ? (
              <ErrorMessage
                {...(error as ErrorMessageConfig)}
                compact
                animated={false}
                className="text-sm"
              />
            ) : (
              <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                <ExclamationCircleIcon className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200" role="alert">
                  {error as string}
                </p>
              </div>
            )}
          </div>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;