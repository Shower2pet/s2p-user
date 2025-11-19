import { Card } from '@/components/ui/card';
import { Timer, Coins } from 'lucide-react';
import { branding } from '@/config/branding';
import { useLanguage } from '@/i18n/LanguageContext';

export const PriceCard = () => {
  const { station } = branding;
  const { t } = useLanguage();
  
  return (
    <Card className="p-6 bg-gradient-to-br from-sky/10 to-primary/10 border-2 border-sky shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {station.currency}{station.pricePerSession.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground font-light">
              {t('home.pricePerSession')}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-2 text-primary">
            <Timer className="w-5 h-5" />
            <span className="text-xl font-bold">{station.durationMinutes} min</span>
          </div>
          <div className="text-xs text-muted-foreground font-light">
            {t('home.fullService')}
          </div>
        </div>
      </div>
    </Card>
  );
};
