
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ChartBarIcon,
  HomeIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../hooks/useNotificationMigration';
import { dashboardService } from '../../services/dashboardService';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme, actualTheme } = useTheme();
  const { showSuccess } = useNotification();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hasFreeAnalysisAvailable, setHasFreeAnalysisAvailable] = useState(false);
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  // Fetch free analysis availability
  React.useEffect(() => {
    const fetchFreeAnalysisAvailability = async () => {
      if (user?.id) {
        try {
          const stats = await dashboardService.getStats(user.id);
          setHasFreeAnalysisAvailable(stats.hasFreeAnalysisAvailable);
        } catch (error) {
          console.error('Error fetching free analysis availability:', error);
        }
      }
    };

    fetchFreeAnalysisAvailability();
  }, [user?.id]);

  // Handle keyboard navigation and focus management
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isMobileMenuOpen || isUserMenuOpen)) {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
        // Return focus to the button that opened the menu
        if (mobileMenuButtonRef.current) {
          mobileMenuButtonRef.current.focus();
        }
      }
    };

    if (isMobileMenuOpen || isUserMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, isUserMenuOpen]);

  // Navigation items
  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Analisi CV', href: '/analisi', icon: DocumentTextIcon },
    { name: 'Prezzi', href: '/pricing', icon: CreditCardIcon },
  ];

  // Theme toggle
  const handleThemeToggle = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Get theme icon
  const getThemeIcon = () => {
    if (theme === 'light') return SunIcon;
    if (theme === 'dark') return MoonIcon;
    return ComputerDesktopIcon;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Disconnessione effettuata con successo');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if route is active
  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // Get user initials
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Get credits badge color
  const getCreditsBadgeVariant = () => {
    if (!profile?.credits) return 'danger';
    if (profile.credits < 2) return 'danger';
    if (profile.credits <= 3) return 'warning';
    if (profile.credits <= 6) return 'info';
    return 'success';
  };

  const ThemeIcon = getThemeIcon();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo variant="resumeai" size="md" linkTo={user ? '/dashboard' : '/'} />
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleThemeToggle}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              title={`Tema: ${theme === 'light' ? 'Chiaro' : theme === 'dark' ? 'Scuro' : 'Sistema'}`}
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>

            {user ? (
              <>
                {/* Credits Badge or Free Analysis Badge */}
                {hasFreeAnalysisAvailable ? (
                  <div className="hidden sm:flex items-center">
                    <Badge
                      variant="success"
                      size="sm"
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      leftIcon={<SparklesIcon className="h-3 w-3" />}
                    >
                      Analisi Gratuita
                    </Badge>
                  </div>
                ) : profile?.credits !== undefined && (
                  <div className="hidden sm:flex items-center">
                    <Badge
                      variant={getCreditsBadgeVariant()}
                      size="sm"
                      leftIcon={<CreditCardIcon className="h-3 w-3" />}
                    >
                      {profile.credits}
                    </Badge>
                  </div>
                )}

                {/* User Menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {getUserInitials()}
                    </div>
                  </Button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {profile?.first_name && profile?.last_name
                            ? `${profile.first_name} ${profile.last_name}`
                            : user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                        {hasFreeAnalysisAvailable ? (
                          <div className="mt-2 sm:hidden">
                            <Badge
                              variant="success"
                              size="sm"
                              className="w-fit bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              leftIcon={<SparklesIcon className="h-3 w-3" />}
                            >
                              Analisi Gratuita
                            </Badge>
                          </div>
                        ) : profile?.credits !== undefined && (
                          <div className="mt-2 sm:hidden">
                            <Badge
                              variant={getCreditsBadgeVariant()}
                              size="sm"
                              className="w-fit"
                              leftIcon={<CreditCardIcon className="h-3 w-3" />}
                            >
                              {profile.credits} crediti
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Cog6ToothIcon className="h-4 w-4 mr-3" />
                        Impostazioni
                      </Link>
                      
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                        Disconnetti
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <button
                  ref={mobileMenuButtonRef}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-menu"
                  aria-label={isMobileMenuOpen ? 'Chiudi menu di navigazione' : 'Apri menu di navigazione'}
                  type="button"
                >
                  <div className="relative w-5 h-5">
                    <span 
                      className={`absolute block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? 'rotate-45 top-2' : 'top-1'
                      }`}
                    />
                    <span 
                      className={`absolute block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ease-in-out top-2 ${
                        isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                      }`}
                    />
                    <span 
                      className={`absolute block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? '-rotate-45 top-2' : 'top-3'
                      }`}
                    />
                  </div>
                </button>
              </>
            ) : (
              /* Login/Register buttons for non-authenticated users */
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Accedi
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Registrati
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && (
          <div 
             id="mobile-menu"
             className={`md:hidden fixed inset-x-0 top-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ease-in-out transform ${
               isMobileMenuOpen 
                 ? 'translate-y-0 opacity-100 visible' 
                 : '-translate-y-full opacity-0 invisible'
             }`}
             style={{ zIndex: 45 }}
             role="dialog"
             aria-modal="true"
           >
            <nav className="px-4 py-6 space-y-1" role="navigation" aria-label="Menu di navigazione mobile">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 touch-manipulation min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                       isActive
                         ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                         : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                     }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5 mr-4 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Credits/Free Analysis Badge */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                {hasFreeAnalysisAvailable ? (
                  <div className="flex items-center justify-center">
                    <Badge
                      variant="success"
                      size="md"
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      leftIcon={<SparklesIcon className="h-4 w-4" />}
                    >
                      Analisi Gratuita Disponibile
                    </Badge>
                  </div>
                ) : profile?.credits !== undefined && (
                  <div className="flex items-center justify-center">
                    <Badge
                      variant={getCreditsBadgeVariant()}
                      size="md"
                      leftIcon={<CreditCardIcon className="h-4 w-4" />}
                    >
                      {profile.credits} crediti rimanenti
                    </Badge>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMobileMenuOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsUserMenuOpen(false);
              setIsMobileMenuOpen(false);
            }
          }}
          aria-hidden="true"
        />
      )}
    </header>
  );
};

export default Header;
