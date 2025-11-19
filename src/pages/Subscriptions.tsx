import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Subscriptions = () => {
  const navigate = useNavigate();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const handleActivate = (planId: string) => {
    setActivePlanId(planId);
    toast.success('Subscription activated successfully!');
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/credits')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground font-light">
            Save more with our subscription plans
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {branding.subscriptionPlans.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isActive={activePlanId === plan.id}
              onActivate={() => handleActivate(plan.id)}
            />
          ))}
        </div>

        {activePlanId && (
          <div className="bg-success/10 border border-success rounded-xl p-6 text-center space-y-3">
            <p className="font-bold text-foreground">
              Your subscription is active
            </p>
            <p className="text-sm text-muted-foreground font-light">
              You will be charged on the next billing cycle
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Subscriptions;
