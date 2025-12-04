import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Subscriptions = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleActivate = async (planId: string, stripePriceId?: string) => {
    setLoadingPlanId(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: stripePriceId || 'price_placeholder',
          mode: 'subscription',
          quantity: 1,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Error processing subscription');
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/credits')}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {t('subscriptionPlans')}
          </h1>
          <p className="text-muted-foreground font-light">
            {t('chooseYourPlan')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {branding.subscriptionPlans.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isActive={activePlanId === plan.id}
              isLoading={loadingPlanId === plan.id}
              onActivate={() => handleActivate(plan.id, plan.stripePriceId)}
            />
          ))}
        </div>

        {activePlanId && (
          <div className="bg-success/10 border border-success rounded-xl p-6 text-center space-y-3">
            <p className="font-bold text-foreground">
              {t('activeSubscriptionMessage')}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Subscriptions;
