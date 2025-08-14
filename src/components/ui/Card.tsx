import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  clickable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'rounded-lg transition-all duration-200',
      clickable && 'cursor-pointer',
    ];

    const variantClasses = {
      default: [
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        hover && 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
        clickable && 'hover:shadow-lg active:scale-[0.98]',
      ],
      outlined: [
        'bg-transparent',
        'border-2 border-gray-200 dark:border-gray-700',
        hover && 'hover:border-gray-300 dark:hover:border-gray-600',
        clickable && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      ],
      elevated: [
        'bg-white dark:bg-gray-800',
        'shadow-lg border border-gray-100 dark:border-gray-700',
        hover && 'hover:shadow-xl hover:border-gray-200 dark:hover:border-gray-600',
        clickable && 'hover:shadow-2xl active:scale-[0.98]',
      ],
      filled: [
        'bg-gray-50 dark:bg-gray-700',
        'border border-gray-100 dark:border-gray-600',
        hover && 'hover:bg-gray-100 dark:hover:bg-gray-600',
        clickable && 'hover:shadow-md active:scale-[0.98]',
      ],
    };

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between',
          'pb-4 border-b border-gray-200 dark:border-gray-700',
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, spacing = 'md', children, ...props }, ref) => {
    const spacingClasses = {
      none: '',
      sm: 'py-2',
      md: 'py-4',
      lg: 'py-6',
    };

    return (
      <div
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, justify = 'end', children, ...props }, ref) => {
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3',
          'pt-4 border-t border-gray-200 dark:border-gray-700',
          justifyClasses[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;