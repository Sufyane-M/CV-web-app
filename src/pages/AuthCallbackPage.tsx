import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/ui/Loading';
import { useNotification } from '../hooks/useNotificationMigration';
import { auth as supaAuth } from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace('#', ''));

    const error = params.get('error') || hash.get('error');
    const errorDescription = params.get('error_description') || hash.get('error_description');

    if (error || errorDescription) {
      showError(errorDescription || error || 'Errore durante l\'autenticazione OAuth');
      navigate('/login', { replace: true });
      return;
    }

    // Assicura che Supabase processi il fragment e aggiorni la sessione
    // detectSessionInUrl è attivo, ma forziamo un getSession per essere sicuri
    const finalize = async () => {
      try {
        const { data } = await supaAuth.getSession();
        if (data?.session || user) {
          navigate('/dashboard', { replace: true });
        } else {
          // Se non c'è session, torna al login
          navigate('/login', { replace: true });
        }
      } catch {
        navigate('/login', { replace: true });
      }
    };

    const timeout = setTimeout(finalize, 200);
    return () => clearTimeout(timeout);
  }, [location.search, location.hash, navigate, user, showError]);

  return <Loading fullScreen text="Completamento accesso..." />;
};

export default AuthCallbackPage;


