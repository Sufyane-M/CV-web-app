import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  KeyIcon,
  BellIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../hooks/useNotificationMigration';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge, { CreditBadge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/Modal';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';
import { formatDate } from '../utils/formatters';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, updatePassword, deleteAccount, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showError, showSuccess, showWarning } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'account'>('profile');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Notifications preferences
  const [notifications, setNotifications] = useState({
    email: true,

    marketing: false,
  });
  
  // Initialize form data
  useEffect(() => {
    if (user && profile) {
      setProfileForm({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: user.email || '',
      });
    }
  }, [user, profile]);
  
  // Handle profile form changes
  const handleProfileChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm(prev => ({ ...prev, [field]: e.target.value }));
    if (profileErrors[field]) {
      setProfileErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  // Handle password form changes
  const handlePasswordChange = (field: keyof PasswordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm(prev => ({ ...prev, [field]: e.target.value }));
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  // Validate profile form
  const validateProfileForm = (): boolean => {
    const errors: ProfileErrors = {};
    
    const firstNameValidation = validateRequired(profileForm.firstName, 'Nome');
    if (!firstNameValidation.isValid) {
      errors.firstName = firstNameValidation.error;
    }
    
    const lastNameValidation = validateRequired(profileForm.lastName, 'Cognome');
    if (!lastNameValidation.isValid) {
      errors.lastName = lastNameValidation.error;
    }
    
    const emailValidation = validateEmail(profileForm.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate password form
  const validatePasswordForm = (): boolean => {
    const errors: PasswordErrors = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Password attuale richiesta';
    }
    
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.isValid) {
      errors.newPassword = passwordValidation.error;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Le password non corrispondono';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) return;
    
    setProfileLoading(true);
    try {
      const result = await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
      });
      
      if (result.success) {
        showSuccess('Profilo aggiornato con successo');
      } else {
        showError(result.error || 'Errore durante l\'aggiornamento del profilo');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      showError('Errore durante l\'aggiornamento del profilo');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setPasswordLoading(true);
    try {
      const result = await updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      if (result.success) {
        showSuccess('Password aggiornata con successo');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        showError(result.error || 'Errore durante l\'aggiornamento della password');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      showError('Errore durante l\'aggiornamento della password');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteAccount();
      
      if (result.success) {
        showSuccess('Account eliminato con successo');
        navigate('/');
      } else {
        showError(result.error || 'Errore durante l\'eliminazione dell\'account');
      }
    } catch (error: any) {
      console.error('Delete account error:', error);
      showError('Errore durante l\'eliminazione dell\'account');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };
  
  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    showSuccess(`Tema cambiato in ${newTheme === 'light' ? 'chiaro' : newTheme === 'dark' ? 'scuro' : 'sistema'}`);
  };
  
  // Render tabs
  const renderTabs = () => {
    const tabs = [
      { id: 'profile', label: 'Profilo', icon: UserIcon },
      { id: 'security', label: 'Sicurezza', icon: KeyIcon },
      { id: 'preferences', label: 'Preferenze', icon: BellIcon },
      { id: 'account', label: 'Account', icon: TrashIcon },
    ] as const;
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  };
  
  // Render profile tab
  const renderProfileTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Informazioni Personali
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Aggiorna le tue informazioni personali
          </p>
        </CardHeader>
        
        <form onSubmit={handleProfileUpdate}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome"
                type="text"
                value={profileForm.firstName}
                onChange={handleProfileChange('firstName')}
                error={profileErrors.firstName}
                placeholder="Mario"
                required
              />
              
              <Input
                label="Cognome"
                type="text"
                value={profileForm.lastName}
                onChange={handleProfileChange('lastName')}
                error={profileErrors.lastName}
                placeholder="Rossi"
                required
              />
            </div>
            
            <Input
              label="Email"
              type="email"
              value={profileForm.email}
              onChange={handleProfileChange('email')}
              error={profileErrors.email}
              placeholder="mario.rossi@email.com"
              required
            />
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              loading={profileLoading}
              disabled={profileLoading}
            >
              Salva Modifiche
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Account Stats */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Statistiche Account
          </h3>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {profile?.credits || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Crediti Rimanenti</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {profile?.total_analyses || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Analisi Totali</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {user?.created_at ? formatDate(user.created_at) : 'N/A'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Membro dal</p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => navigate('/pricing')}
            leftIcon={<CreditCardIcon className="h-4 w-4" />}
          >
            Acquista Crediti
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
  
  // Render security tab
  const renderSecurityTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cambia Password
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Aggiorna la tua password per mantenere l'account sicuro
          </p>
        </CardHeader>
        
        <form onSubmit={handlePasswordUpdate}>
          <CardContent className="space-y-4">
            <Input
              label="Password Attuale"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange('currentPassword')}
              error={passwordErrors.currentPassword}
              placeholder="Inserisci la password attuale"
              required
            />
            
            <Input
              label="Nuova Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange('newPassword')}
              error={passwordErrors.newPassword}
              placeholder="Inserisci la nuova password"
              required
            />
            
            <Input
              label="Conferma Nuova Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange('confirmPassword')}
              error={passwordErrors.confirmPassword}
              placeholder="Conferma la nuova password"
              required
            />
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              loading={passwordLoading}
              disabled={passwordLoading}
            >
              Aggiorna Password
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Security Info */}
      <Card variant="outlined" className="border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Suggerimenti per la Sicurezza
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                <li>• Usa una password di almeno 8 caratteri</li>
                <li>• Includi lettere maiuscole, minuscole, numeri e simboli</li>
                <li>• Non riutilizzare password di altri account</li>
                <li>• Cambia la password regolarmente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render preferences tab
  const renderPreferencesTab = () => (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tema
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scegli l'aspetto dell'applicazione
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <SunIcon className="h-8 w-8 text-yellow-500" />
                <span className="font-medium text-gray-900 dark:text-white">Chiaro</span>
              </div>
            </button>
            
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <MoonIcon className="h-8 w-8 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">Scuro</span>
              </div>
            </button>
            
            <button
              onClick={() => handleThemeChange('system')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                theme === 'system'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <ComputerDesktopIcon className="h-8 w-8 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">Sistema</span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
      
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifiche
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gestisci le tue preferenze di notifica
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Notifiche Email</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ricevi aggiornamenti via email
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
          

          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Email Marketing</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ricevi suggerimenti e offerte speciali
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.marketing}
              onChange={(e) => setNotifications(prev => ({ ...prev, marketing: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button variant="outline">
            Salva Preferenze
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
  
  // Render account tab
  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Export Data */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Esporta Dati
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scarica una copia dei tuoi dati
          </p>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Puoi richiedere un'esportazione di tutti i tuoi dati, incluse le analisi e le informazioni del profilo.
          </p>
        </CardContent>
        
        <CardFooter>
          <Button
            variant="outline"
            leftIcon={<DocumentTextIcon className="h-4 w-4" />}
          >
            Richiedi Esportazione
          </Button>
        </CardFooter>
      </Card>
      
      {/* Delete Account */}
      <Card variant="outlined" className="border-red-200 dark:border-red-800">
        <CardHeader>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Elimina Account
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            Elimina permanentemente il tuo account e tutti i dati associati
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Attenzione: Questa azione è irreversibile
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                <li>• Tutti i tuoi dati verranno eliminati permanentemente</li>
                <li>• Le analisi e la cronologia andranno perse</li>
                <li>• I crediti rimanenti non saranno rimborsabili</li>
                <li>• Non potrai recuperare l'account dopo l'eliminazione</li>
              </ul>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            leftIcon={<TrashIcon className="h-4 w-4" />}
          >
            Elimina Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Impostazioni
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci il tuo account e le preferenze
          </p>
        </div>
        
        {/* Tabs */}
        <Card className="mb-6">
          <CardContent className="p-0">
            {renderTabs()}
          </CardContent>
        </Card>
        
        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'account' && renderAccountTab()}
        </div>
        
        {/* Delete Account Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          title="Elimina Account"
          description="Sei sicuro di voler eliminare il tuo account? Questa azione eliminerà permanentemente tutti i tuoi dati e non può essere annullata."
          confirmText="Elimina Account"
          cancelText="Annulla"
          variant="danger"
          loading={deleteLoading}
        />
      </div>
    </div>
  );
};

export default SettingsPage;