import { useUnifiedNotification } from '../contexts/UnifiedNotificationContext';
import { NotificationOptions } from '../contexts/UnifiedNotificationContext';

/**
 * Hook di compatibilità per migrare dal vecchio sistema di notifiche
 * al nuovo sistema unificato. Mantiene la stessa API del vecchio useNotification
 * ma utilizza internamente il nuovo sistema unificato.
 */
export const useNotification = () => {
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismiss,
    dismissAll,
  } = useUnifiedNotification();

  // Mantiene compatibilità con la vecchia API
  const showSuccessNotification = (message: string, options?: NotificationOptions) => {
    return showSuccess(message, options);
  };

  const showErrorNotification = (message: string, options?: NotificationOptions) => {
    return showError(message, options);
  };

  const showWarningNotification = (message: string, options?: NotificationOptions) => {
    return showWarning(message, options);
  };

  const showInfoNotification = (message: string, options?: NotificationOptions) => {
    return showInfo(message, options);
  };

  const showLoadingNotification = (message: string, options?: NotificationOptions) => {
    return showLoading(message, options);
  };

  // Alias per compatibilità con react-hot-toast
  const toast = {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    dismiss,
    remove: dismiss,
    dismissAll,
  };

  return {
    // Nuova API unificata
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismiss,
    dismissAll,
    
    // API di compatibilità
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    showLoadingNotification,
    
    // Compatibilità con toast
    toast,
  };
};

export default useNotification;