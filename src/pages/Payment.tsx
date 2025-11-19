import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Payment = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    // Mock payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    navigate('/payment/success');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Payment
          </h1>
          <p className="text-muted-foreground font-light">
            Complete your payment to start the service
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Order Summary</h2>
            
            <div className="space-y-3 py-4 border-y border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">Station</span>
                <span className="font-bold text-foreground">{branding.station.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">Duration</span>
                <span className="font-bold text-foreground">{branding.station.durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">Location</span>
                <span className="font-bold text-foreground">{branding.clientName}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-foreground">Total</span>
              <span className="text-3xl font-bold text-primary">
                {branding.station.currency}{branding.station.pricePerSession.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={isLoading}
            variant="default"
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Proceed to Payment
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground font-light">
            You will be redirected to our secure payment provider
          </p>
        </Card>

        <Card className="p-4 bg-mint/10 border-mint">
          <p className="text-sm text-center text-muted-foreground font-light">
            💳 We accept all major credit and debit cards
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default Payment;
