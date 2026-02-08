import { Card } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export const SafetyInfo = () => {
  const { t } = useLanguage();

  const tips = [
    t('safety1'),
    t('safety2'),
    t('safety3'),
    t('safety4'),
  ];

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-5 h-5 text-mint" />
        <h3 className="text-sm font-bold text-foreground">{t('safetyRecommendations')}</h3>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground font-light">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-mint shrink-0" />
            {tip}
          </li>
        ))}
      </ul>
    </Card>
  );
};
