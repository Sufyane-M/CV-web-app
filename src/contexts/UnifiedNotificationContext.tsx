import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import UnifiedNotification, { NotificationType, NotificationSize } from '../components/ui/UnifiedNotification';
import { cn } from '../utils/cn';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  size?: NotificationSize;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'filled' | 'outlined' | 'minimal';
  showIcon?: boolean;
}

export interface NotificationOptions {
  title?: string;
  size?: NotificationSize;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'filled' | 'outlined' | 'minimal';
  showIcon?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

interface UnifiedNotificationContextType {
  // Basic notification methods
  showSuccess: (message: string, options?: NotificationOptions) => string;
  showError: (message: string, options?: NotificationOptions) => string;
  showWarning: (message: string, options?: NotificationOptions) => string;
  showInfo: (message: string, options?: NotificationOptions) => string;
  showLoading: (message: string, options?: NotificationOptions) => string;
  
  // Advanced methods
  showNotification: (notification: Omit<NotificationItem, 'id'>) => string;
  updateNotification: (id: string, updates: Partial<NotificationItem>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  
  // State
  notifications: NotificationItem[];
}

const UnifiedNotificationContext = createContext<UnifiedNotificationContextType | undefined>(undefined);

export const useUnifiedNotification = () => {
  const context = useContext(UnifiedNotificationContext);
  if (context === undefined) {
    throw new Error('useUnifiedNotification must be used within a UnifiedNotificationProvider');
  }
  return context;
};

interface UnifiedNotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  defaultPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  defaultDuration?: number;
}

// Notification Container Component
const NotificationContainer: React.FC<{
  notifications: NotificationItem[];
  position: string;
  onDismiss: (id: string) => void;
}> = ({ notifications, position, onDismiss }) => {
  const getPositionClasses = (position: string) => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    };
    return positions[position as keyof typeof positions] || positions['top-right'];
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 max-w-sm w-full',
        'pointer-events-none',
        getPositionClasses(position)
      )}
    >
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={cn(
            'pointer-events-auto transform transition-all duration-300 ease-out',
            'animate-slide-up',
            index > 0 && 'animation-delay-100'
          )}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <UnifiedNotification
            type={notification.type}
            title={notification.title}
            message={notification.message}
            size={notification.size}
            dismissible={notification.dismissible}
            onDismiss={() => onDismiss(notification.id)}
            action={notification.action}
            showIcon={notification.showIcon}
            variant={notification.variant}
          />
        </div>
      ))}
    </div>
  );
};

export const UnifiedNotificationProvider: React.FC<UnifiedNotificationProviderProps> = ({
  children,
  maxNotifications = 5,
  defaultPosition = 'top-right',
  defaultDuration = 4000,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [timers, setTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique ID
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clear timer for a notification
  const clearTimer = useCallback((id: string) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      setTimers(prev => {
        const newTimers = new Map(prev);
        newTimers.delete(id);
        return newTimers;
      });
    }
  }, [timers]);

  // Set auto-dismiss timer
  const setAutoDismissTimer = useCallback((id: string, duration: number) => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      
      setTimers(prev => new Map(prev).set(id, timer));
    }
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const id = generateId();
    const newNotification: NotificationItem = {
      id,
      size: 'md',
      duration: defaultDuration,
      dismissible: true,
      showIcon: true,
      variant: 'filled',
      ...notification,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit number of notifications
      if (updated.length > maxNotifications) {
        const removed = updated.slice(maxNotifications);
        removed.forEach(n => clearTimer(n.id));
        return updated.slice(0, maxNotifications);
      }
      return updated;
    });

    // Set auto-dismiss timer
    if (newNotification.duration && newNotification.duration > 0) {
      setAutoDismissTimer(id, newNotification.duration);
    }

    return id;
  }, [generateId, defaultDuration, maxNotifications, clearTimer, setAutoDismissTimer]);

  // Dismiss notification
  const dismiss = useCallback((id: string) => {
    clearTimer(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [clearTimer]);

  // Dismiss all notifications
  const dismissAll = useCallback(() => {
    timers.forEach((timer) => clearTimeout(timer));
    setTimers(new Map());
    setNotifications([]);
  }, [timers]);

  // Update notification
  const updateNotification = useCallback((id: string, updates: Partial<NotificationItem>) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, ...updates }
          : notification
      )
    );
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message: string, options?: NotificationOptions) => {
    return addNotification({
      type: 'success',
      message,
      ...options,
    });
  }, [addNotification]);

  const showError = useCallback((message: string, options?: NotificationOptions) => {
    return addNotification({
      type: 'error',
      message,
      duration: options?.duration ?? 6000, // Longer duration for errors
      ...options,
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, options?: NotificationOptions) => {
    return addNotification({
      type: 'warning',
      message,
      duration: options?.duration ?? 5000,
      ...options,
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, options?: NotificationOptions) => {
    return addNotification({
      type: 'info',
      message,
      ...options,
    });
  }, [addNotification]);

  const showLoading = useCallback((message: string, options?: NotificationOptions) => {
    return addNotification({
      type: 'loading',
      message,
      duration: 0, // Loading notifications don't auto-dismiss
      dismissible: false,
      ...options,
    });
  }, [addNotification]);

  const showNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    return addNotification(notification);
  }, [addNotification]);

  const value: UnifiedNotificationContextType = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showNotification,
    updateNotification,
    dismiss,
    dismissAll,
    notifications,
  };

  return (
    <UnifiedNotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <NotificationContainer
          notifications={notifications}
          position={defaultPosition}
          onDismiss={dismiss}
        />,
        document.body
      )}
    </UnifiedNotificationContext.Provider>
  );
};

export default UnifiedNotificationContext;