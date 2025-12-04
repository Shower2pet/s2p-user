import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStation } from '@/hooks/useStations';
import { supabase } from '@/integrations/supabase/client';
import { Play, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const ServiceActivation = () => {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const { data: station, isLoading } = useStation(stationId);

  if (isLoading) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

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

  const creditsNeeded = station.duration_minutes / 5;
  const currentCredits = profile?.credits || 0;
  const hasEnoughCredits = currentCredits >= creditsNeeded;

  const handleActivateService = async () => {
    if (!user || !hasEnoughCredits) {
      navigate('/credits');
      return;
    }

    setIsActivating(true);
    try {
      const newCredits = currentCredits - creditsNeeded;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: creditsNeeded * 100,
        product_type: 'session_usage',
        description: `${station.name} - ${station.duration_minutes} ${t('minutes')}`,
        status: 'completed',
      });

      await refreshProfile();

      toast.success(t('serviceActivated'));
      navigate(`/${stationId}/session`);
    } catch (error) {
      console.error('Error activating service:', error);
      toast.error(t('activationError'));
    } finally {
      setIsActivating(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

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
            {t('activateService')}
          </h1>
          <p className="text-muted-foreground font-light">
            {t('confirmActivation')}
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">{t('serviceSummary')}</h2>
            
            <div className="space-y-3 py-4 border-y border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">{t('station')}</span>
                <span className="font-bold text-foreground">{station.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">{t('duration')}</span>
                <span className="font-bold text-foreground">{station.duration_minutes} {t('minutes')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-light">{t('location')}</span>
                <span className="font-bold text-foreground">{station.location}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-foreground">{t('creditsRequired')}</span>
              <span className="text-3xl font-bold text-primary">
                {creditsNeeded} {t('credits')}
              </span>
            </div>
          </div>

          <Card className={`p-4 ${hasEnoughCredits ? 'bg-success/10 border-success' : 'bg-destructive/10 border-destructive'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!hasEnoughCredits && <AlertCircle className="w-5 h-5 text-destructive" />}
                <span className="font-medium">{t('yourCredits')}</span>
              </div>
              <span className={`font-bold ${hasEnoughCredits ? 'text-success' : 'text-destructive'}`}>
                {currentCredits} {t('credits')}
              </span>
            </div>
            {!hasEnoughCredits && (
              <p className="text-sm text-destructive mt-2">
                {t('notEnoughCredits')} ({creditsNeeded - currentCredits} {t('creditsNeeded')})
              </p>
            )}
          </Card>

          {hasEnoughCredits ? (
            <Button
              onClick={handleActivateService}
              disabled={isActivating}
              variant="default"
              size="lg"
              className="w-full"
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('activating')}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {t('activateNow')}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/credits')}
              variant="default"
              size="lg"
              className="w-full"
            >
              {t('buyCredits')}
            </Button>
          )}
        </Card>

        <Card className="p-4 bg-sky/10 border-sky">
          <p className="text-sm text-center text-muted-foreground font-light">
            ℹ️ {t('creditDeductionInfo')}
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default ServiceActivation;
