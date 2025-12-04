import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { branding } from '@/config/branding';
import { useLanguage } from '@/hooks/useLanguage';

interface CreditPackCardProps {
  pack: typeof branding.creditPacks[0];
  onPurchase: () => void;
  isLoading?: boolean;
}

export const CreditPackCard = ({ pack, onPurchase, isLoading }: CreditPackCardProps) => {
  const { t } = useLanguage();
  
  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
      {pack.badge && (
        <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
          {pack.badge}
        </Badge>
      )}
      
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">{pack.name}</h3>
          <p className="text-sm text-muted-foreground font-light mt-1">
            {pack.description}
          </p>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">
            {branding.station.currency}{pack.price}
          </span>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-mint/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-mint-foreground" />
          <div>
            <div className="font-bold text-foreground">
              {pack.credits} {t('credits')}
            </div>
            <div className="text-xs text-muted-foreground font-light">
              +{pack.bonus} {t('bonus')}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={onPurchase}
          variant="default"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('processing')}
            </>
          ) : (
            t('purchase')
          )}
        </Button>
      </div>
    </Card>
  );
};
