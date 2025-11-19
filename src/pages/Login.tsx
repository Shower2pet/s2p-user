import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import logoVertical from '@/assets/logo-vertical.png';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.fillFields'));
      return;
    }
    toast.success(t('auth.loginSuccess'));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <img 
            src={logoVertical} 
            alt="Shower2Pet"
            className="h-32 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground">{t('auth.welcomeBack')}</h1>
          <p className="text-muted-foreground font-light">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full">
            {t('auth.login')}
          </Button>
        </form>

        <div className="text-center space-y-3">
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-primary hover:underline font-light"
          >
            {t('auth.forgotPassword')}
          </button>
          <div className="text-sm text-muted-foreground font-light">
            {t('auth.noAccount')}{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-primary hover:underline font-bold"
            >
              {t('auth.createAccount')}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
