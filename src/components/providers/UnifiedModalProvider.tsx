import React, { createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import UnifiedModal, { UnifiedConfirmModal } from '../ui/UnifiedModal';
import Button from '../ui/Button';
import { useUnifiedModal } from '../../hooks/useUnifiedModal';
import { cn } from '../../utils/cn';

interface UnifiedModalContextType {
  openModal: (content: React.ReactNode, options?: any, footer?: React.ReactNode) => void;
  closeModal: () => void;
  openConfirmModal: (options?: any) => Promise<boolean>;
  closeConfirmModal: (result?: boolean) => void;
  openAlertModal: (options?: any) => Promise<void>;
  closeAlertModal: () => void;
  confirmDelete: (itemName?: string) => Promise<boolean>;
  confirmAction: (title: string, description?: string) => Promise<boolean>;
  confirmSave: (hasUnsavedChanges?: boolean) => Promise<boolean>;
  showSuccessAlert: (title: string, description?: string) => Promise<void>;
  showErrorAlert: (title: string, description?: string) => Promise<void>;
  showWarningAlert: (title: string, description?: string) => Promise<void>;
  showInfoAlert: (title: string, description?: string) => Promise<void>;
}

const UnifiedModalContext = createContext<UnifiedModalContextType | undefined>(undefined);

export const useUnifiedModalContext = () => {
  const context = useContext(UnifiedModalContext);
  if (context === undefined) {
    throw new Error('useUnifiedModalContext must be used within a UnifiedModalProvider');
  }
  return context;
};

interface UnifiedModalProviderProps {
  children: ReactNode;
}

export const UnifiedModalProvider: React.FC<UnifiedModalProviderProps> = ({ children }) => {
  const {
    modalState,
    confirmModalState,
    alertModalState,
    openModal,
    closeModal,
    openConfirmModal,
    closeConfirmModal,
    openAlertModal,
    closeAlertModal,
    confirmDelete,
    confirmAction,
    confirmSave,
    showSuccessAlert,
    showErrorAlert,
    showWarningAlert,
    showInfoAlert,
  } = useUnifiedModal();

  const value: UnifiedModalContextType = {
    openModal,
    closeModal,
    openConfirmModal,
    closeConfirmModal,
    openAlertModal,
    closeAlertModal,
    confirmDelete,
    confirmAction,
    confirmSave,
    showSuccessAlert,
    showErrorAlert,
    showWarningAlert,
    showInfoAlert,
  };

  return (
    <UnifiedModalContext.Provider value={value}>
      {children}
      
      {/* Modal generico */}
      {createPortal(
        <UnifiedModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.options.title}
          description={modalState.options.description}
          variant={modalState.options.variant}
          size={modalState.options.size}
          showCloseButton={modalState.options.showCloseButton}
          closeOnOverlayClick={modalState.options.closeOnOverlayClick}
          closeOnEscape={modalState.options.closeOnEscape}
          className={modalState.options.className}
          footer={modalState.footer}
        >
          {modalState.content}
        </UnifiedModal>,
        document.body
      )}
      
      {/* Modal di conferma */}
      {createPortal(
        <UnifiedConfirmModal
          isOpen={confirmModalState.isOpen}
          onClose={() => closeConfirmModal(false)}
          onConfirm={async () => {
            if (confirmModalState.options.onConfirm) {
              try {
                await confirmModalState.options.onConfirm();
                closeConfirmModal(true);
              } catch (error) {
                console.error('Error in confirm action:', error);
                // Non chiudere il modal in caso di errore
              }
            } else {
              closeConfirmModal(true);
            }
          }}
          onCancel={() => {
            if (confirmModalState.options.onCancel) {
              confirmModalState.options.onCancel();
            }
            closeConfirmModal(false);
          }}
          title={confirmModalState.options.title}
          description={confirmModalState.options.description}
          variant={confirmModalState.options.variant}
          size={confirmModalState.options.size}
          confirmText={confirmModalState.options.confirmText}
          cancelText={confirmModalState.options.cancelText}
          showCancelButton={confirmModalState.options.showCancelButton}
          confirmButtonVariant={confirmModalState.options.confirmButtonVariant}
          cancelButtonVariant={confirmModalState.options.cancelButtonVariant}
          loading={confirmModalState.options.loading}
          closeOnOverlayClick={confirmModalState.options.closeOnOverlayClick}
          closeOnEscape={confirmModalState.options.closeOnEscape}
          className={confirmModalState.options.className}
        />,
        document.body
      )}
      
      {/* Modal di alert */}
      {createPortal(
        <UnifiedModal
          isOpen={alertModalState.isOpen}
          onClose={closeAlertModal}
          title={alertModalState.options.title}
          description={alertModalState.options.description}
          variant={alertModalState.options.variant}
          size={alertModalState.options.size}
          showCloseButton={false}
          closeOnOverlayClick={alertModalState.options.closeOnOverlayClick}
          closeOnEscape={alertModalState.options.closeOnEscape}
          className={alertModalState.options.className}
          footer={
            <div className="flex justify-end">
              <Button
                variant={alertModalState.options.confirmButtonVariant || 'primary'}
                onClick={closeAlertModal}
                loading={alertModalState.options.loading}
                className="min-w-[80px]"
              >
                {alertModalState.options.buttonText || 'OK'}
              </Button>
            </div>
          }
        >
          {/* Il contenuto è già nel title/description */}
        </UnifiedModal>,
        document.body
      )}
    </UnifiedModalContext.Provider>
  );
};

export default UnifiedModalProvider;