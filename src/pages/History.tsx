import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  total_value: number;
  transaction_type: string;
  status: string | null;
  created_at: string | null;
  station_id: string | null;
  payment_method: string | null;
  credits_purchased: number | null;
  amount_paid_stripe: number | null;
  amount_paid_wallet: number | null;
}

const History = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  const sessions = transactions.filter(tx => tx.transaction_type === 'WASH_SERVICE' || tx.transaction_type === 'GUEST_WASH');
  const payments = transactions.filter(tx => tx.transaction_type === 'CREDIT_TOPUP');

  const getStatusColor = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'bg-success text-foreground';
      case 'PENDING': return 'bg-warning text-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderTransaction = (tx: Transaction) => (
    <Card key={tx.id} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold">
              {tx.created_at ? format(new Date(tx.created_at), 'dd MMM yyyy') : '-'}
            </span>
            <Clock className="w-4 h-4 text-muted-foreground ml-2" />
            <span className="text-sm text-muted-foreground font-light">
              {tx.created_at ? format(new Date(tx.created_at), 'HH:mm') : '-'}
            </span>
          </div>
          {tx.station_id && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="font-light">{tx.station_id}</span>
            </div>
          )}
          {tx.payment_method && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="font-light">{tx.payment_method}</span>
            </div>
          )}
        </div>
        <div className="text-right space-y-2">
          <div className="text-lg font-bold text-foreground">€{tx.total_value.toFixed(2)}</div>
          {tx.status && (
            <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
          )}
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('historyTitle')}</h1>
          <p className="text-muted-foreground font-light">{t('historyDesc')}</p>
        </div>

        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions">{t('sessions')}</TabsTrigger>
            <TabsTrigger value="payments">{t('payments')}</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-3 mt-6">
            {sessions.length > 0 ? sessions.map(renderTransaction) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground font-light">Nessuna sessione</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-3 mt-6">
            {payments.length > 0 ? payments.map(renderTransaction) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground font-light">Nessun pagamento</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default History;
