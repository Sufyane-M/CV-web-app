import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'resumeai' | 'cvcraft' | 'talentscan';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  linkTo?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'resumeai', 
  size = 'md', 
  showText = true, 
  className = '',
  linkTo = '/'
}) => {
  const sizeClasses = {
    sm: { icon: 'h-6 w-6', text: 'text-lg' },
    md: { icon: 'h-8 w-8', text: 'text-xl' },
    lg: { icon: 'h-12 w-12', text: 'text-2xl' },
    xl: { icon: 'h-16 w-16', text: 'text-3xl' }
  };

  const variants = {
    resumeai: {
      name: 'ResumeAI',
      tagline: 'Smart CV Platform',
      colors: 'from-blue-500 to-purple-600'
    },
    cvcraft: {
      name: 'CVCraft',
      tagline: 'Craft Your Success',
      colors: 'from-emerald-500 to-blue-600'
    },
    talentscan: {
      name: 'TalentScan',
      tagline: 'Discover Your Potential',
      colors: 'from-orange-500 to-red-600'
    }
  };

  const currentVariant = variants[variant];
  const currentSize = sizeClasses[size];

  // Modern geometric logo icon
  const LogoIcon = () => (
    <div className={`${currentSize.icon} relative flex-shrink-0`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id={`gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-blue-500" stopColor="currentColor" />
            <stop offset="100%" className="text-purple-600" stopColor="currentColor" />
          </linearGradient>
        </defs>
        
        {/* Main circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill={`url(#gradient-${variant})`}
          className="drop-shadow-lg"
        />
        
        {/* Inner geometric pattern based on variant */}
        {variant === 'resumeai' && (
          <>
            {/* AI-inspired neural network pattern */}
            <circle cx="12" cy="12" r="2" fill="white" opacity="0.9" />
            <circle cx="28" cy="12" r="2" fill="white" opacity="0.9" />
            <circle cx="20" cy="20" r="2.5" fill="white" />
            <circle cx="12" cy="28" r="2" fill="white" opacity="0.9" />
            <circle cx="28" cy="28" r="2" fill="white" opacity="0.9" />
            <line x1="12" y1="12" x2="20" y2="20" stroke="white" strokeWidth="1.5" opacity="0.7" />
            <line x1="28" y1="12" x2="20" y2="20" stroke="white" strokeWidth="1.5" opacity="0.7" />
            <line x1="20" y1="20" x2="12" y2="28" stroke="white" strokeWidth="1.5" opacity="0.7" />
            <line x1="20" y1="20" x2="28" y2="28" stroke="white" strokeWidth="1.5" opacity="0.7" />
          </>
        )}
        
        {variant === 'cvcraft' && (
          <>
            {/* Craft-inspired geometric shapes */}
            <rect x="12" y="10" width="16" height="2" rx="1" fill="white" />
            <rect x="12" y="14" width="12" height="2" rx="1" fill="white" opacity="0.8" />
            <rect x="12" y="18" width="14" height="2" rx="1" fill="white" opacity="0.8" />
            <rect x="12" y="22" width="10" height="2" rx="1" fill="white" opacity="0.8" />
            <rect x="12" y="26" width="8" height="2" rx="1" fill="white" opacity="0.6" />
            <circle cx="30" cy="15" r="3" fill="white" opacity="0.3" />
          </>
        )}
        
        {variant === 'talentscan' && (
          <>
            {/* Scan-inspired radar pattern */}
            <circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
            <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            <circle cx="20" cy="20" r="4" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="1" opacity="0.4" />
            <circle cx="20" cy="20" r="2" fill="white" />
            {/* Scanning dots */}
            <circle cx="26" cy="14" r="1.5" fill="white" opacity="0.8" />
            <circle cx="14" cy="26" r="1.5" fill="white" opacity="0.8" />
          </>
        )}
      </svg>
    </div>
  );

  const content = (
    <div className={`flex items-center ${className}`}>
      <LogoIcon />
      {showText && (
        <div className="ml-3">
          <div className={`font-bold text-gray-900 dark:text-white ${currentSize.text} leading-tight`}>
            {currentVariant.name}
          </div>
          {size === 'lg' || size === 'xl' ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
              {currentVariant.tagline}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;