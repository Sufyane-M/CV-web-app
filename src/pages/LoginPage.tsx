import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Logo from '../components/ui/Logo';
import { validateEmail, validateRequired } from '../utils/validation';

interface LoginForm {
  email: string;
  password: string;
}

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Get redirect path from location state
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  
  const handleInputChange = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};
    
    // Email validation
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }
    
    // Password validation
    const passwordValidation = validateRequired(form.password, 'Password');
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const result = await signIn(form.email, form.password);
      
      if (result.success) {
        showSuccess('Accesso effettuato con successo!');
        navigate(from, { replace: true });
      } else {
        setErrors({ general: result.error || 'Errore durante l\'accesso' });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ general: 'Errore imprevisto durante l\'accesso' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Avvia il flusso OAuth: la pagina verrà reindirizzata a Google e tornerà su /auth/callback
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setErrors({ general: 'Errore durante l\'accesso con Google' });
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo variant="resumeai" size="lg" linkTo="/" />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Accedi al tuo account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Non hai un account?{' '}
          <Link
            to="/register"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Registrati qui
          </Link>
        </p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              placeholder="inserisci@email.com"
              autoComplete="email"
              required
            />
            
            {/* Password */}
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              placeholder="Inserisci la tua password"
              autoComplete="current-password"
              required
            />
            
            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Ricordami
                </label>
              </div>
              
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Password dimenticata?
                </a>
              </div>
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>
          
          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Oppure continua con
                </span>
              </div>
            </div>
            
            {/* Google Sign In */}
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={loading}
                leftIcon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
              >
                Accedi con Google
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Footer Links */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-300">
              Home
            </Link>
            <Link to="/pricing" className="hover:text-gray-900 dark:hover:text-gray-300">
              Prezzi
            </Link>
            <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300">
              Supporto
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;