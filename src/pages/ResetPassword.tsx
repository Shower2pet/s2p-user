import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSession, updatePassword } from '@/services/authService';
import { useLanguage } from '@/hooks/useLanguage';
import { z } from 'zod';
import shower2petLogo from '@/assets/shower2pet-logo.png';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const passwordSchema = z.string()
    .min(8, t('password'))
    .regex(/[A-Z]/, t('password'))
    .regex(/[a-z]/, t('password'))
    .regex(/[0-9]/, t('password'));

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) { toast.error(t('invalidOrExpiredLink')); navigate('/forgot-password'); }
      setSessionChecked(true);
    }).catch(() => { toast.error(t('invalidOrExpiredLink')); navigate('/forgot-password'); });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error(t('passwordsDontMatch')); return; }
    try {
      passwordSchema.parse(password);
      setLoading(true);
      await updatePassword(password);
      toast.success(t('passwordUpdated'));
      navigate('/login');
    } catch (error) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error((error as Error).message || t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center">
        <p className="text-muted-foreground">{t('verifying')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <img src={shower2petLogo} alt="Shower2Pet" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">{t('newPassword')}</h1>
          <p className="text-muted-foreground font-light">{t('newPasswordDesc')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('newPassword')}</Label>
            <Input id="password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
          </div>
          <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
            {loading ? t('updating') : t('updatePassword')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
