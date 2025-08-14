import { useState, useCallback } from 'react';
import { ModalVariant, ModalSize } from '../components/ui/UnifiedModal';

export interface ModalOptions {
  title?: string;
  description?: string;
  variant?: ModalVariant;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export interface ConfirmModalOptions extends ModalOptions {
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  cancelButtonVariant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  showCancelButton?: boolean;
  loading?: boolean;
}

export interface AlertModalOptions extends Omit<ConfirmModalOptions, 'showCancelButton' | 'onCancel' | 'cancelText'> {
  buttonText?: string;
  onClose?: () => void;
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions;
  content?: React.ReactNode;
  footer?: React.ReactNode;
}

interface ConfirmModalState {
  isOpen: boolean;
  options: ConfirmModalOptions;
  resolve?: (value: boolean) => void;
}

interface AlertModalState {
  isOpen: boolean;
  options: AlertModalOptions;
  resolve?: () => void;
}

/**
 * Hook unificato per la gestione dei modali
 * Fornisce metodi per aprire diversi tipi di modali con stili coerenti
 */
export const useUnifiedModal = () => {
  // Stati per diversi tipi di modali
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    options: {},
  });

  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({
    isOpen: false,
    options: {},
  });

  const [alertModalState, setAlertModalState] = useState<AlertModalState>({
    isOpen: false,
    options: {},
  });

  // Modal generico
  const openModal = useCallback((content: React.ReactNode, options: ModalOptions = {}, footer?: React.ReactNode) => {
    setModalState({
      isOpen: true,
      options: {
        size: 'md',
        showCloseButton: true,
        closeOnOverlayClick: true,
        closeOnEscape: true,
        ...options,
      },
      content,
      footer,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Modal di conferma
  const openConfirmModal = useCallback((options: ConfirmModalOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModalState({
        isOpen: true,
        options: {
          size: 'sm',
          variant: 'default',
          confirmText: 'Conferma',
          cancelText: 'Annulla',
          showCancelButton: true,
          confirmButtonVariant: 'primary',
          cancelButtonVariant: 'secondary',
          closeOnOverlayClick: false,
          closeOnEscape: true,
          loading: false,
          ...options,
        },
        resolve,
      });
    });
  }, []);

  const closeConfirmModal = useCallback((result: boolean = false) => {
    if (confirmModalState.resolve) {
      confirmModalState.resolve(result);
    }
    setConfirmModalState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [confirmModalState.resolve]);

  // Modal di alert/avviso
  const openAlertModal = useCallback((options: AlertModalOptions = {}): Promise<void> => {
    return new Promise((resolve) => {
      setAlertModalState({
        isOpen: true,
        options: {
          size: 'sm',
          variant: 'info',
          buttonText: 'OK',
          confirmButtonVariant: 'primary',
          closeOnOverlayClick: false,
          closeOnEscape: true,
          loading: false,
          ...options,
        },
        resolve,
      });
    });
  }, []);

  const closeAlertModal = useCallback(() => {
    if (alertModalState.resolve) {
      alertModalState.resolve();
    }
    if (alertModalState.options.onClose) {
      alertModalState.options.onClose();
    }
    setAlertModalState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [alertModalState.resolve, alertModalState.options]);

  // Metodi di convenienza per diversi tipi di conferma
  const confirmDelete = useCallback((itemName?: string): Promise<boolean> => {
    return openConfirmModal({
      title: 'Conferma eliminazione',
      description: itemName 
        ? `Sei sicuro di voler eliminare "${itemName}"? Questa azione non può essere annullata.`
        : 'Sei sicuro di voler eliminare questo elemento? Questa azione non può essere annullata.',
      variant: 'error',
      confirmText: 'Elimina',
      confirmButtonVariant: 'danger',
    });
  }, [openConfirmModal]);

  const confirmAction = useCallback((title: string, description?: string): Promise<boolean> => {
    return openConfirmModal({
      title,
      description,
      variant: 'warning',
      confirmText: 'Continua',
      confirmButtonVariant: 'primary',
    });
  }, [openConfirmModal]);

  const confirmSave = useCallback((hasUnsavedChanges: boolean = true): Promise<boolean> => {
    if (!hasUnsavedChanges) return Promise.resolve(true);
    
    return openConfirmModal({
      title: 'Modifiche non salvate',
      description: 'Hai delle modifiche non salvate. Vuoi salvarle prima di continuare?',
      variant: 'warning',
      confirmText: 'Salva',
      cancelText: 'Non salvare',
      confirmButtonVariant: 'primary',
    });
  }, [openConfirmModal]);

  // Metodi di convenienza per alert
  const showSuccessAlert = useCallback((title: string, description?: string): Promise<void> => {
    return openAlertModal({
      title,
      description,
      variant: 'success',
      buttonText: 'OK',
    });
  }, [openAlertModal]);

  const showErrorAlert = useCallback((title: string, description?: string): Promise<void> => {
    return openAlertModal({
      title,
      description,
      variant: 'error',
      buttonText: 'OK',
    });
  }, [openAlertModal]);

  const showWarningAlert = useCallback((title: string, description?: string): Promise<void> => {
    return openAlertModal({
      title,
      description,
      variant: 'warning',
      buttonText: 'OK',
    });
  }, [openAlertModal]);

  const showInfoAlert = useCallback((title: string, description?: string): Promise<void> => {
    return openAlertModal({
      title,
      description,
      variant: 'info',
      buttonText: 'OK',
    });
  }, [openAlertModal]);

  return {
    // Stati dei modali
    modalState,
    confirmModalState,
    alertModalState,
    
    // Controlli modali generici
    openModal,
    closeModal,
    
    // Controlli modali di conferma
    openConfirmModal,
    closeConfirmModal,
    
    // Controlli modali di alert
    openAlertModal,
    closeAlertModal,
    
    // Metodi di convenienza per conferme
    confirmDelete,
    confirmAction,
    confirmSave,
    
    // Metodi di convenienza per alert
    showSuccessAlert,
    showErrorAlert,
    showWarningAlert,
    showInfoAlert,
  };
};

export default useUnifiedModal;