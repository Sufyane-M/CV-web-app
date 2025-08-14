import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  overlay = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const renderSpinner = () => (
    <Loader2 className={cn('animate-spin text-primary-600', sizeClasses[size])} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-primary-600 rounded-full animate-pulse',
            size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        'bg-primary-600 rounded-full animate-pulse-slow',
        sizeClasses[size]
      )}
    />
  );

  const renderBars = () => (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-primary-600 animate-pulse',
            size === 'sm' ? 'w-1' : size === 'md' ? 'w-1.5' : size === 'lg' ? 'w-2' : 'w-3'
          )}
          style={{
            height: `${20 + (i % 2) * 10}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s',
          }}
        />
      ))}
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-3',
      className
    )}>
      {renderLoader()}
      {text && (
        <p className={cn(
          'text-gray-600 dark:text-gray-400 font-medium',
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton Loading Component
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'text',
  animation = 'pulse',
  className,
}) => {
  const baseClasses = [
    'bg-gray-200 dark:bg-gray-700',
    animation === 'pulse' && 'animate-pulse',
    animation === 'wave' && 'animate-pulse', // Could implement wave animation
  ];

  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={style}
    />
  );
};

// Loading Overlay Component
export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingProps?: Omit<LoadingProps, 'overlay'>;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  loadingProps,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <Loading
          {...loadingProps}
          overlay
        />
      )}
    </div>
  );
};

// Loading Button Component
export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ];

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className={cn(
          'animate-spin mr-2',
          size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        )} />
      )}
      {loading ? (loadingText || 'Caricamento...') : children}
    </button>
  );
};

export default Loading;