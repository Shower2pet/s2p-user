import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CreditPackCard } from '@/components/credits/CreditPackCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Plus, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Credits = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const handlePurchase = async (pack: typeof branding.creditPacks[0]) => {
    setLoadingPackId(pack.id);
    try {
      // In production, you would have actual Stripe price IDs in branding config
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: pack.stripePriceId || 'price_placeholder',
          mode: 'payment',
          quantity: 1,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Error processing payment');
    } finally {
      setLoadingPackId(null);
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

        {/* Subscription Link */}
        <Card className="p-6 bg-gradient-to-r from-sand/10 to-accent/10 border-sand">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {t('saveWithSubscription')}
              </h3>
              <p className="text-sm text-muted-foreground font-light">
                {t('chooseYourPlan')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/subscriptions')}
              variant="accent"
              size="lg"
            >
              <TrendingUp className="w-5 h-5" />
              {t('viewPlans')}
            </Button>
          </div>
        </Card>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t('recentTransactions')}</h2>
          <div className="space-y-2">
            {[
              { date: 'Today, 14:30', type: 'Used', amount: -1, description: 'Session at Doccia Bracco' },
              { date: 'Yesterday', type: 'Top-up', amount: +12, description: 'Purchased Starter Pack' },
              { date: '3 days ago', type: 'Used', amount: -1, description: 'Session at Doccia Bracco' },
            ].map((transaction, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground font-light">{transaction.date}</p>
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    transaction.amount > 0 ? "text-success" : "text-foreground"
                  )}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} {t('credits')}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Credits;
