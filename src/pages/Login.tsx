import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { loginSchema } from '@/lib/validation';
import { z } from 'zod';
import shower2petLogo from '@/assets/shower2pet-logo.png';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TEST MODE: Bypass authentication - accept any credentials
    // TODO: Remove this before production!
    setLoading(true);
    
    // Simulate a brief loading time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success('Accesso effettuato con successo (TEST MODE)');
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <img 
            src={shower2petLogo} 
            alt="Shower2Pet"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground">{t('login')}</h1>
          <p className="text-muted-foreground font-light">
            Login to your Shower2Pet account
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : t('login')}
          </Button>
        </form>

        <div className="text-center space-y-3">
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-primary hover:underline font-light"
            disabled={loading}
          >
            {t('forgotPassword')}
          </button>
          <div className="text-sm text-muted-foreground font-light">
            {t('dontHaveAccount')}{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-primary hover:underline font-bold"
              disabled={loading}
            >
              {t('register')}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
