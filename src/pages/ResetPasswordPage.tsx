import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotificationMigration';
import { auth as supaAuth } from '../services/supabase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      showError('La password deve essere di almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supaAuth.updatePassword(password);
      if (error) {
        showError(error.message || 'Errore durante l\'aggiornamento della password');
        return;
      }
      showSuccess('Password aggiornata correttamente');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card className="p-6">
          <h1 className="text-xl font-semibold mb-4">Imposta una nuova password</h1>
          <form onSubmit={handleSubmit}>
            <Input
              label="Nuova password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la nuova password"
              required
            />
            <Button type="submit" fullWidth loading={loading} disabled={loading} className="mt-4">
              Aggiorna password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;


