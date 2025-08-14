// Import specific types from database
import type { 
  Database,
  CVAnalysisSuggestion,
  CVAnalysisScores,
  CVAnalysisMatchData,
  CVAnalysisResults,
  CVAnalysisStatus,
  AnalysisType,
  ScanType
} from './database';

// Re-export database types
export type {
  Database,
  CVAnalysisSuggestion,
  CVAnalysisScores,
  CVAnalysisMatchData,
  CVAnalysisResults,
  CVAnalysisStatus,
  AnalysisType,
  ScanType
};

// Define main application types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type PaymentTransaction = Database['public']['Tables']['payments']['Row'];
export type CVAnalysis = Database['public']['Tables']['cv_analyses']['Row'];
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row'];

// Additional types specific to the application
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}



export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  credits: number;
  features: string[];
  popular?: boolean;
}

// UI State Types
export interface AppState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}



export interface PaymentState {
  isProcessing: boolean;
  transactions: PaymentTransaction[];
  error: string | null;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

export interface ProfileForm {
  full_name: string;
  email: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Modal Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ConfirmModalProps extends ModalProps {
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

// Upload Types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadState {
  file: File | null;
  progress: UploadProgress | null;
  error: string | null;
  isUploading: boolean;
}



// Dashboard Types
export interface DashboardStats {
  total_analyses: number;
  completed_analyses: number;
  pending_analyses: number;
  credits_remaining: number;

}



// Onboarding Types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  component?: React.ComponentType;
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// Event Types
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  user_id?: string;
  timestamp?: string;
}

// Feature Flag Types
export interface FeatureFlags {
  enableSocialLogin: boolean;
  enableDarkMode: boolean;
  enableAnalytics: boolean;
  enableBetaFeatures: boolean;
}

// Localization Types
export type SupportedLocale = 'it' | 'en';

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  flag: string;
}

// Export utility type helpers
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;