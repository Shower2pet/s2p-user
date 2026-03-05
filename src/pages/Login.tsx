import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { loginSchema } from '@/lib/validation';
import { signInWithPassword, signInWithGoogle } from '@/services/authService';
import { z } from 'zod';
import shower2petLogo from '@/assets/shower2pet-logo.png';
import { Separator } from '@/components/ui/separator';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate('/');
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = loginSchema.parse({ email, password });
      setLoading(true);
      const data = await signInWithPassword(validated.email, validated.password);
      if (data.user) toast.success(t('loginSuccess'));
    } catch (error: any) {
      if (error instanceof z.ZodError) { toast.error(error.errors[0].message); return; }
      const msg = error?.message ?? String(error);
      if (msg.includes('Invalid login credentials')) {
        toast.error(t('invalidCredentials'));
      } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        toast.error(t('connectionError'));
      } else {
        toast.error(msg || t('genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle(window.location.origin);
    } catch (error: any) {
      toast.error(error?.message || t('genericError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-5 sm:space-y-6">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <img src={shower2petLogo} alt="Shower2Pet" className="h-12 sm:h-16 w-auto mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('login')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-light">{t('loginSubtitle')}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full flex items-center justify-center gap-3"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t('continueWithGoogle')}
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground font-light">{t('orDivider')}</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
          </div>
          <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
            {loading ? t('loggingIn') : t('login')}
          </Button>
        </form>
        <div className="text-center space-y-3">
          <button onClick={() => navigate('/forgot-password')} className="text-sm text-primary hover:underline font-light" disabled={loading}>
            {t('forgotPassword')}
          </button>
          <div className="text-sm text-muted-foreground font-light">
            {t('dontHaveAccount')}{' '}
            <button onClick={() => navigate('/register')} className="text-primary hover:underline font-bold" disabled={loading}>
              {t('register')}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
