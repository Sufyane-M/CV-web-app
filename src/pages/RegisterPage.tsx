import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Logo from '../components/ui/Logo';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface RegisterErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  
  const handleInputChange = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Update password strength
    if (field === 'password' && typeof value === 'string') {
      const validation = validatePassword(value);
      setPasswordStrength(validation.strength || null);
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: RegisterErrors = {};
    
    // First name validation
    const firstNameValidation = validateRequired(form.firstName, 'Nome');
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error;
    }
    
    // Last name validation
    const lastNameValidation = validateRequired(form.lastName, 'Cognome');
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error;
    }
    
    // Email validation
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }
    
    // Password validation
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }
    
    // Confirm password validation
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono';
    }
    
    // Terms acceptance validation
    if (!form.acceptTerms) {
      newErrors.acceptTerms = 'Devi accettare i termini e condizioni';
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
      if (import.meta.env.DEV) {
        console.log('Starting registration process...');
      }
      
      const result = await signUp(
        form.email,
        form.password,
        {
          firstName: form.firstName,
          lastName: form.lastName,
        }
      );
      
      if (import.meta.env.DEV) {
        console.log('Registration result:', result);
      }
      
      // Check if there's an error in the result
      if (result.error) {
        if (import.meta.env.DEV) {
          console.error('Registration failed:', result.error);
        }
        setErrors({ general: result.error });
      } else {
        // Registration successful
        if (import.meta.env.DEV) {
          console.log('Registration successful');
        }
        showSuccess('Registrazione completata! Controlla la tua email per confermare l\'account.');
        
        // Clear form
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: false,
        });
        
        // Navigate to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Registration exception:', error);
      }
      setErrors({ 
        general: error.message || 'Errore imprevisto durante la registrazione. Riprova.' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Avvia il flusso OAuth: redirect a Google e ritorno su /auth/callback
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign up error:', error);
      setErrors({ general: 'Errore durante la registrazione con Google' });
      setLoading(false);
    }
  };
  
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'weak': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };
  
  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 'strong': return 'Password forte';
      case 'medium': return 'Password media';
      case 'weak': return 'Password debole';
      default: return '';
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
          Crea il tuo account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Hai già un account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Accedi qui
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
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome"
                type="text"
                value={form.firstName}
                onChange={handleInputChange('firstName')}
                error={errors.firstName}
                placeholder="Mario"
                autoComplete="given-name"
                required
              />
              
              <Input
                label="Cognome"
                type="text"
                value={form.lastName}
                onChange={handleInputChange('lastName')}
                error={errors.lastName}
                placeholder="Rossi"
                autoComplete="family-name"
                required
              />
            </div>
            
            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              placeholder="mario.rossi@email.com"
              autoComplete="email"
              required
            />
            
            {/* Password */}
            <div>
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                placeholder="Crea una password sicura"
                autoComplete="new-password"
                required
              />
              {form.password && passwordStrength && (
                <p className={`mt-1 text-xs ${getPasswordStrengthColor()}`}>
                  {getPasswordStrengthText()}
                </p>
              )}
            </div>
            
            {/* Confirm Password */}
            <Input
              label="Conferma Password"
              type="password"
              value={form.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              placeholder="Ripeti la password"
              autoComplete="new-password"
              required
            />
            
            {/* Terms and Conditions */}
            <div>
              <div className="flex items-start">
                <input
                  id="accept-terms"
                  name="accept-terms"
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={handleInputChange('acceptTerms')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="accept-terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Accetto i{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-500">
                    termini e condizioni
                  </a>{' '}
                  e la{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-500">
                    privacy policy
                  </a>
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.acceptTerms}</p>
              )}
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Registrazione in corso...' : 'Crea Account'}
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
                  Oppure registrati con
                </span>
              </div>
            </div>
            
            {/* Google Sign Up */}
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="lg"
                onClick={handleGoogleSignUp}
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
                Registrati con Google
              </Button>
            </div>
          </div>
          
          {/* Benefits */}
          <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">
              Cosa ottieni con l'account gratuito:
            </h3>
            <ul className="space-y-1 text-xs text-primary-700 dark:text-primary-300">
              <li className="flex items-center">
                <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                1 analisi CV gratuita
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                Punteggio ATS di base
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                Suggerimenti essenziali
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                Cronologia analisi
              </li>
            </ul>
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

export default RegisterPage;