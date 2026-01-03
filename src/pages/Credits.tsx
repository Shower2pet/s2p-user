import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CreditPackCard } from '@/components/credits/CreditPackCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Plus, TrendingUp, Infinity, Star, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  product_type: string;
  status: string;
  created_at: string;
}

const Credits = () => {
  const { t } = useLanguage();
  const { profile, user } = useAuth();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setTransactions(data);
    }
  };

  const handlePurchase = async (pack: typeof branding.creditPacks[0]) => {
    setLoadingPackId(pack.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: pack.price * 100, // Convert to cents
          currency: 'eur',
          productName: pack.name,
          description: pack.description,
          mode: 'payment',
          productType: 'credit_pack',
          credits: pack.credits,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Errore durante il pagamento');
    } finally {
      setLoadingPackId(null);
    }
  };

  const handleSubscription = async (plan: typeof branding.subscriptionPlans[0]) => {
    setLoadingPlanId(plan.id);
    try {
      const credits = (plan as any).creditsPerWeek || (plan as any).creditsPerMonth || 0;
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: plan.price * 100,
          currency: 'eur',
          productName: plan.name,
          description: plan.description,
          mode: 'subscription',
          productType: 'subscription',
          interval: plan.interval,
          credits: credits,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Errore durante il pagamento');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    return `${diffDays} giorni fa`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success';
      case 'pending':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-muted-foreground font-light">
            {t('buyCredits')}
          </p>
        </div>

        {/* Current Balance */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-sky/10 border-2 border-sky shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-light uppercase tracking-wide mb-2">
                {t('currentBalance')}
              </p>
              <p className="text-6xl font-bold text-foreground">
                {profile?.credits || 0}
              </p>
              <p className="text-sm text-muted-foreground font-light mt-2">
                {t('credits')}
              </p>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-mint/10 border-mint">
          <p className="text-sm text-center text-foreground font-light">
            💡 {t('creditValue')}
          </p>
        </Card>

        {/* Top Up Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('creditPacks')}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {branding.creditPacks.map((pack) => (
              <CreditPackCard
                key={pack.id}
                pack={pack}
                onPurchase={() => handlePurchase(pack)}
                isLoading={loadingPackId === pack.id}
              />
            ))}
          </div>
        </div>

        {/* Subscription Plans Section */}
        <div id="subscriptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('subscriptionPlans')}
            </h2>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {t('saveWithSubscription')}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {branding.subscriptionPlans.map((plan) => {
              const isUnlimited = (plan as any).unlimited;
              const unlimitedPlan = plan.id === 'unlimited';
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative overflow-hidden p-6 transition-all ${
                    unlimitedPlan 
                      ? 'bg-gradient-to-br from-primary via-primary to-sky border-2 border-primary shadow-glow-primary' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex items-center gap-1 ${
                        unlimitedPlan 
                          ? 'bg-warning text-warning-foreground' 
                          : 'bg-sand text-sand-foreground'
                      }`}>
                        {unlimitedPlan && <Star className="w-3 h-3" />}
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-xl font-bold ${unlimitedPlan ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-sm font-light mt-1 ${unlimitedPlan ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {plan.description}
                      </p>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${unlimitedPlan ? 'text-primary-foreground' : 'text-primary'}`}>
                        €{plan.price}
                      </span>
                      <span className={unlimitedPlan ? 'text-primary-foreground/80' : 'text-muted-foreground'}>
                        /{plan.interval === 'week' ? 'sett' : 'mese'}
                      </span>
                    </div>
                    
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      unlimitedPlan ? 'bg-white/20' : 'bg-mint/20'
                    }`}>
                      {unlimitedPlan ? (
                        <Infinity className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <Coins className="w-5 h-5 text-mint-foreground" />
                      )}
                      <div className={unlimitedPlan ? 'text-primary-foreground' : ''}>
                        <div className={`font-bold ${unlimitedPlan ? '' : 'text-foreground'}`}>
                          {isUnlimited ? (
                            'Lavaggi illimitati'
                          ) : (plan as any).creditsPerWeek ? (
                            `${(plan as any).creditsPerWeek} crediti/sett`
                          ) : (
                            `${(plan as any).creditsPerMonth} crediti/mese`
                          )}
                        </div>
                        <div className={`text-xs font-light ${unlimitedPlan ? 'opacity-80' : 'text-muted-foreground'}`}>
                          {plan.billingCycle}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleSubscription(plan)}
                      disabled={loadingPlanId === plan.id}
                      className={`w-full ${
                        unlimitedPlan 
                          ? 'bg-white text-primary hover:bg-white/90 font-bold' 
                          : ''
                      }`}
                      variant={unlimitedPlan ? 'default' : 'default'}
                      size="lg"
                    >
                      {loadingPlanId === plan.id ? (
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
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t('recentTransactions')}</h2>
          <div className="space-y-2">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground font-light">
                        {formatDate(transaction.created_at)} • <span className={getStatusBadge(transaction.status)}>{transaction.status}</span>
                      </p>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      €{(transaction.amount / 100).toFixed(2)}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-4 text-center text-muted-foreground">
                Nessuna transazione
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Credits;
