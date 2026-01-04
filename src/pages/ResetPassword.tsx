import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import shower2petLogo from '@/assets/shower2pet-logo.png';

const passwordSchema = z.string()
  .min(8, 'La password deve essere di almeno 8 caratteri')
  .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
  .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
  .regex(/[0-9]/, 'La password deve contenere almeno un numero');

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Check if user has a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Link non valido o scaduto');
        navigate('/forgot-password');
      }
      setSessionChecked(true);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Le password non corrispondono');
      return;
    }
    
    try {
      passwordSchema.parse(password);
      
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (error) {
        toast.error(error.message);
        return;
      }
      
      toast.success('Password aggiornata con successo');
      navigate('/login');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Si è verificato un errore');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center">
        <p className="text-muted-foreground">Verifica in corso...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <img 
            src={shower2petLogo} 
            alt="Shower2Pet"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground">Nuova Password</h1>
          <p className="text-muted-foreground font-light">
            Inserisci la tua nuova password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nuova Password</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
