import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const { data: wallets } = useWallets();
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
      .eq('transaction_type', 'CREDIT_TOPUP')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
  };

  const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    return `${diffDays} giorni fa`;
  };

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
