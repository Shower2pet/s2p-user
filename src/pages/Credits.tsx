import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallet';

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Credits = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallets, isLoading: walletsLoading } = useWallets();

  if (!user) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-muted-foreground">{t('loginToViewCredits')}</p>
          <Button onClick={() => navigate('/login')}>{t('login')}</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-light">{t('balancesByStructure')}</p>
        </div>

        <div className="space-y-3">
          {walletsLoading ? (
            <Card className="p-4 text-center text-muted-foreground">{t('loading')}</Card>
          ) : wallets && wallets.length > 0 ? (
            wallets.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{w.structure_name || t('structure')}</p>
                  <span className="text-xl font-bold text-primary">€ {w.balance.toFixed(2).replace('.', ',')}</span>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center space-y-2">
              <p className="text-muted-foreground font-light">{t('noCreditsAvailable')}</p>
              <p className="text-sm text-muted-foreground font-light">{t('buyCreditsFromStation')}</p>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Credits;
