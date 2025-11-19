import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PaymentMethods = () => {
  const navigate = useNavigate();

  const handleAddCard = () => {
    toast.success('Card added successfully (mock)');
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Payment Methods
          </h1>
          <p className="text-muted-foreground font-light">
            Manage your saved payment methods
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Visa ending in 1234</p>
              <p className="text-sm text-muted-foreground font-light">Expires 12/25</p>
            </div>
            <Button variant="outline" size="sm">
              Remove
            </Button>
          </div>
        </Card>

        <Button
          onClick={handleAddCard}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Plus className="w-5 h-5" />
          Add Payment Method
        </Button>

        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-center text-muted-foreground font-light">
            🔒 Your payment information is encrypted and secure
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default PaymentMethods;
