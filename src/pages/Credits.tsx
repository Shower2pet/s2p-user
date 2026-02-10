import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallet';
import { useCreditPackages } from '@/hooks/useCreditPackages';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Loader2, Sparkles, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  total_value: number;
  transaction_type: string;
  status: string | null;
  created_at: string | null;
}

const Credits = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallets } = useWallets();
  const { data: packages, isLoading: packagesLoading } = useCreditPackages();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_type', 'CREDIT_TOPUP')
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data) setTransactions(data as Transaction[]);
  };

  const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;

  const handlePurchase = async (pkg: typeof packages extends (infer T)[] ? T : never) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPurchasingId(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: Math.round(pkg.price_eur * 100),
          currency: 'eur',
          productName: `${pkg.name} – ${pkg.credits_value} crediti`,
          productType: 'credit_pack',
          credits: pkg.credits_value,
          structure_id: pkg.structure_id,
          success_url: `${window.location.origin}/credits`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('Errore durante l\'acquisto');
    } finally {
      setPurchasingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    return `${diffDays} giorni fa`;
  };

  // Group packages by structure
  const packagesByStructure = (packages || []).reduce<Record<string, typeof packages>>((acc, pkg) => {
    const key = pkg.structure_id || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(pkg);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-muted-foreground font-light">{t('buyCredits')}</p>
        </div>

        {/* Total Balance */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-sky/10 border-2 border-sky shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-light uppercase tracking-wide mb-2">
                {t('currentBalance')}
              </p>
              <p className="text-6xl font-bold text-foreground">€{totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Wallets per structure */}
        {wallets && wallets.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Per struttura</h2>
            {wallets.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{w.structure_name || 'Struttura'}</p>
                  <span className="text-xl font-bold text-primary">€{w.balance.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Credit Packages */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            <ShoppingCart className="w-5 h-5 inline-block mr-2" />
            Acquista Crediti
          </h2>
          <p className="text-sm text-muted-foreground">
            I crediti acquistati valgono solo per le stazioni della struttura selezionata.
          </p>

          {packagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : Object.keys(packagesByStructure).length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              Nessun pacchetto disponibile
            </Card>
          ) : (
            Object.entries(packagesByStructure).map(([structId, pkgs]) => {
              const structName = pkgs?.[0]?.structure_name || 'Generale';
              return (
                <div key={structId} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {structName}
                  </h3>
                  {pkgs?.map((pkg) => {
                    const bonus = pkg.credits_value - pkg.price_eur;
                    return (
                      <Card key={pkg.id} className="p-5 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <h4 className="text-lg font-bold text-foreground">{pkg.name}</h4>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <span className="font-bold text-primary">{pkg.credits_value} crediti</span>
                              {bonus > 0 && (
                                <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                                  +{bonus} bonus
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <p className="text-2xl font-bold text-foreground">€{pkg.price_eur.toFixed(0)}</p>
                            <Button
                              size="sm"
                              onClick={() => handlePurchase(pkg)}
                              disabled={purchasingId === pkg.id}
                            >
                              {purchasingId === pkg.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Acquista'
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t('recentTransactions')}</h2>
          <div className="space-y-2">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <Card key={tx.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{tx.transaction_type}</p>
                      <p className="text-sm text-muted-foreground font-light">
                        {formatDate(tx.created_at)} • <span className={tx.status === 'COMPLETED' ? 'text-success' : 'text-warning'}>{tx.status}</span>
                      </p>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      €{tx.total_value.toFixed(2)}
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
