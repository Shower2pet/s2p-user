import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Indirizzo email non valido');

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedEmail = emailSchema.parse(email);
      
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast.error(error.message);
        return;
      }
      
      setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
          <p className="text-muted-foreground font-light">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <Button
            onClick={() => navigate('/login')}
            variant="default"
            size="lg"
            className="w-full"
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-sky/10 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Forgot Password?</h1>
          <p className="text-muted-foreground font-light">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Invio in corso...' : 'Invia Link di Reset'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
