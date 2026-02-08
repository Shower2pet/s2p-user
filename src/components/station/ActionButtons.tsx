import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Coins, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';

interface ActionButtonsProps {
  isDisabled: boolean;
  stationId: string;
  stationName: string;
  price: number;
  currency: string;
  durationMinutes: number;
  stripePriceId: string | null;
}

export const ActionButtons = ({
  isDisabled,
  stationId,
  stationName,
  price,
  currency,
  durationMinutes,
  stripePriceId,
}: ActionButtonsProps) => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const creditsNeeded = Math.ceil(price);
  const hasEnoughCredits = (profile?.credits || 0) >= creditsNeeded;

  const handlePayWithCard = async () => {
    if (isDisabled) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: stripePriceId,
          station_id: stationId,
          success_url: `${window.location.origin}/s/${stationId}/timer`,
          cancel_url: window.location.href,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(t('paymentError'));
      console.error('Payment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseCredits = async () => {
    if (isDisabled || !hasEnoughCredits) return;
    setIsActivating(true);
    try {
      // Deduct credits from profile
      const newCredits = (profile?.credits || 0) - creditsNeeded;
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('user_id', user!.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(t('serviceActivated'));
      navigate(`/s/${stationId}/timer`);
    } catch (err: any) {
      toast.error(t('activationError'));
      console.error('Activation error:', err);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Price summary */}
      <Card className="p-4 bg-gradient-to-br from-sky/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">
                {currency}{price.toFixed(2)}
              </span>
              <p className="text-xs text-muted-foreground font-light">{t('price')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Timer className="w-4 h-4" />
            <span className="font-bold">{durationMinutes} {t('minutes')}</span>
          </div>
        </div>
      </Card>

      {/* Pay with Card */}
      <Button
        onClick={handlePayWithCard}
        disabled={isDisabled || isProcessing}
        size="lg"
        className="w-full h-14 text-base rounded-full"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CreditCard className="w-5 h-5" />
        )}
        {isProcessing ? t('processing') : t('payNowWithCard')}
      </Button>

      {/* Use Credits */}
      {user ? (
        <Button
          onClick={hasEnoughCredits ? handleUseCredits : () => navigate('/credits')}
          disabled={isDisabled || isActivating}
          variant="outline"
          size="lg"
          className="w-full h-14 text-base rounded-full"
        >
          {isActivating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Coins className="w-5 h-5 text-primary" />
          )}
          {isActivating
            ? t('activating')
            : hasEnoughCredits
              ? `${t('useMyCredits')} (${profile?.credits || 0})`
              : t('buyCreditsFirst')}
        </Button>
      ) : (
        <Button
          onClick={() => navigate('/login')}
          variant="outline"
          size="lg"
          className="w-full h-14 text-base rounded-full"
        >
          <Coins className="w-5 h-5 text-primary" />
          {t('loginAndUseCredits')}
        </Button>
      )}
    </div>
  );
};
