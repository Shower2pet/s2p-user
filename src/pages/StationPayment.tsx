import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getStationById } from '@/config/stations';

const StationPayment = () => {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const station = getStationById(stationId || '');

  if (!station) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('stationNotFound')}</h1>
          <Button onClick={() => navigate('/map')} className="mt-4">
            {t('backToMap')}
          </Button>
        </div>
      </AppShell>
    );
  }

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: station.stripePriceId,
          mode: 'payment',
          quantity: 1,
          productType: 'session',
          description: `${station.name} - ${station.durationMinutes} ${t('minutes')}`,
          stationId: stationId,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(t('paymentError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/${stationId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {t('payment')}
          </h1>
          <p className="text-muted-foreground font-light">
            {t('completePayment')}
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">{t('orderSummary')}</h2>
            
            <div className="space-y-3 py-4 border-y border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">{t('station')}</span>
                <span className="font-bold text-foreground">{station.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">{t('duration')}</span>
                <span className="font-bold text-foreground">{station.durationMinutes} {t('minutes')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">{t('location')}</span>
                <span className="font-bold text-foreground">{station.location}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-foreground">{t('total')}</span>
              <span className="text-3xl font-bold text-primary">
                €{station.pricePerSession.toFixed(2)}
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
                {t('processing')}
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {t('proceedToPayment')}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground font-light">
            {t('redirectToPayment')}
          </p>
        </Card>

        <Card className="p-4 bg-mint/10 border-mint">
          <p className="text-sm text-center text-muted-foreground font-light">
            💳 {t('acceptedCards')}
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default StationPayment;