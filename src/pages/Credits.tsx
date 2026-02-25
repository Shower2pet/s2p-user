import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallet';
import { useMySubscriptions } from '@/hooks/useSubscriptions';
import { Coins, Wallet, Crown, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { useLanguage as useLang } from '@/hooks/useLanguage';

const Credits = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const { data: subscriptions, isLoading: subsLoading } = useMySubscriptions();
  const [hideExpired, setHideExpired] = useState(false);
  const dateLocale = language === 'it' ? it : enUS;

  if (!user) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6 text-center">
          <h1 className="text-3xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-muted-foreground">{t('loginToViewCredits')}</p>
          <Button onClick={() => navigate('/login')}>{t('login')}</Button>
        </div>
      </AppShell>
    );
  }

  const filtered = hideExpired
    ? subscriptions?.filter(s => s.status === 'active') || []
    : subscriptions || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">{t('statusActive')}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">{t('statusCancelled')}</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-muted-foreground">{t('statusExpired')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('myCredits')}</h1>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {t('balancesByStructure')}
          </h2>
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
            <Card className="p-6 text-center space-y-2">
              <p className="text-muted-foreground">{t('noCreditsAvailable')}</p>
              <p className="text-sm text-muted-foreground">{t('buyCreditsFromStation')}</p>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            {t('mySubscriptions')}
          </h2>

          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">{t('hideExpired')}</span>
            <Switch checked={hideExpired} onCheckedChange={setHideExpired} />
          </div>

          {subsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center space-y-3">
              <Crown className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('noSubscriptionFound')}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((sub) => (
                <Card key={sub.id} className={`p-4 ${sub.status === 'active' ? 'border-accent/30' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{sub.plan?.name || t('plan')}</p>
                        {getStatusBadge(sub.status)}
                      </div>
                      {sub.plan?.description && (
                        <p className="text-xs text-muted-foreground mt-1">{sub.plan.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {t('from')} {format(new Date(sub.starts_at), 'dd MMM yyyy', { locale: dateLocale })}
                          {sub.ends_at && ` ${t('to')} ${format(new Date(sub.ends_at), 'dd MMM yyyy', { locale: dateLocale })}`}
                        </span>
                      </div>
                      {sub.plan?.max_washes_per_month && sub.status === 'active' && (
                        <p className="text-xs text-primary mt-1">
                          {sub.washes_used_this_period}/{sub.plan.max_washes_per_month} {t('washesUsed')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent">€ {sub.plan?.price_eur?.toFixed(2).replace('.', ',') || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        /{sub.plan?.interval === 'month' ? t('month') : t('year')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Credits;
