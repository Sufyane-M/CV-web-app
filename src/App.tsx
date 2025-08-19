import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import { ThemeProvider } from './contexts/ThemeContext';
import { UnifiedNotificationProvider } from './contexts/UnifiedNotificationContext';
import { UnifiedModalProvider } from './components/providers/UnifiedModalProvider';
import { useAuth } from './contexts/AuthContext';
import { PrefetchProvider } from './hooks/usePrefetch';
// MemoryOptimizer è ora applicato a livello root in modo condizionale; non importato qui
// sposta qualsiasi lavoro non critico fuori dal critical path

// Carica la landing in modo sincrono per evitare il fallback full-screen al primo paint
import LandingPage from './pages/LandingPage';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AnalysisDetailPage = lazy(() => import('./pages/AnalysisDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'));
const PaymentErrorPage = lazy(() => import('./pages/PaymentErrorPage'));

// Components
import Layout from './components/shared/Layout';
import Loading from './components/ui/Loading';
import ScrollToTop from './components/shared/ScrollToTop';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Caricamento..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Non bloccare le route pubbliche: mostra il contenuto anche durante il check auth
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<Loading text="Caricamento..." />}> 
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        {/* OAuth & password callbacks */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/pricing" element={<Layout><PricingPage /></Layout>} />
      
      {/* Payment Routes */}
      <Route
        path="/payment/success"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/cancel"
        element={
          <ProtectedRoute>
            <PaymentCancelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/error"
        element={
          <ProtectedRoute>
            <PaymentErrorPage />
          </ProtectedRoute>
        }
      />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analisi"
        element={
          <ProtectedRoute>
            <Layout>
              <AnalysisPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <HistoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analisi/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <AnalysisDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

// Rimosso PerformanceWrapper e qualsiasi inizializzazione del performance monitor

// Main App Component
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UnifiedNotificationProvider>
        <UnifiedModalProvider>
          <AuthProvider>
            <Router>
              <PrefetchProvider>
                <div className="min-h-screen bg-background text-text-primary transition-colors duration-200">
                  <ScrollToTop behavior="auto" />
                  <AppRoutes />
                </div>
              </PrefetchProvider>
            </Router>
          </AuthProvider>
        </UnifiedModalProvider>
      </UnifiedNotificationProvider>
    </ThemeProvider>
  );
};

export default App;