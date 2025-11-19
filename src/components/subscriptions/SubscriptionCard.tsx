import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { branding } from '@/config/branding';

interface SubscriptionCardProps {
  plan: typeof branding.subscriptionPlans[0];
  isActive?: boolean;
  onActivate: () => void;
}

export const SubscriptionCard = ({ plan, isActive, onActivate }: SubscriptionCardProps) => {
  return (
    <Card className={cn(
      "p-6 hover:shadow-lg transition-all duration-300 relative",
      isActive && "border-2 border-primary shadow-md"
    )}>
      {plan.badge && (
        <Badge className="absolute top-4 right-4 bg-sand text-sand-foreground">
          {plan.badge}
        </Badge>
      )}
      
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
          <p className="text-sm text-muted-foreground font-light mt-1">
            {plan.description}
          </p>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">
            {branding.station.currency}{plan.price}
          </span>
          <span className="text-muted-foreground font-light">
            / {plan.interval}
          </span>
        </div>
        
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-2 text-foreground">
            <Check className="w-5 h-5 text-success" />
            <span className="font-light">
              {plan.creditsPerWeek ? `${plan.creditsPerWeek} credits per week` : `${plan.creditsPerMonth} credits per month`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Check className="w-5 h-5 text-success" />
            <span className="font-light">Billed {plan.billingCycle.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Check className="w-5 h-5 text-success" />
            <span className="font-light">Auto-renewal</span>
          </div>
        </div>
        
        <Button 
          onClick={onActivate}
          variant={isActive ? "outline" : "default"}
          size="lg"
          className="w-full"
          disabled={isActive}
        >
          {isActive ? 'Active Plan' : 'Activate Subscription'}
        </Button>
      </div>
    </Card>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
