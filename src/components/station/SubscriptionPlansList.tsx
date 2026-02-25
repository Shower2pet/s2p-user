import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2 } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptions';
import { useLanguage } from '@/hooks/useLanguage';

interface SubscriptionPlansListProps {
  plans: SubscriptionPlan[];
  activePlanId?: string | null;
  onSubscribe: (plan: SubscriptionPlan) => void;
  isProcessing?: boolean;
}

export const SubscriptionPlansList = ({ plans, activePlanId, onSubscribe, isProcessing }: SubscriptionPlansListProps) => {
  const { t } = useLanguage();
  if (plans.length === 0) return null;

  const intervalLabel = (interval: string) => interval === 'month' ? t('perMonth') : t('perYear');

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Crown className="w-5 h-5 text-accent" />
        {t('availableSubscriptions')}
      </h2>
      {plans.map((plan) => {
        const isActive = activePlanId === plan.id;
        return (
          <Card
            key={plan.id}
            className={`p-4 transition-all ${isActive ? 'ring-2 ring-accent border-accent/30 bg-accent/5' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">{plan.name}</p>
                  {isActive && (
                    <Badge variant="outline" className="border-accent text-accent text-xs">
                      {t('activeBadge')}
                    </Badge>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.max_washes_per_month
                    ? `${plan.max_washes_per_month} ${t('washesPerInterval')}/${intervalLabel(plan.interval)}`
                    : `${t('unlimitedWashes')}/${intervalLabel(plan.interval)}`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-accent">€{plan.price_eur.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">/{intervalLabel(plan.interval)}</p>
              </div>
            </div>
            {!isActive && (
              <Button
                onClick={() => onSubscribe(plan)}
                disabled={isProcessing}
                className="w-full mt-3"
                variant="accent"
                size="sm"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {t('subscribe')}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
};
