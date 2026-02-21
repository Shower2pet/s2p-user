import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, MapPin, CreditCard, Loader2, Coins, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/database';
import { fetchTransactions, downloadReceiptPdf } from '@/services/transactionService';

const History = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await fetchTransactions(50);
        setTransactions(data);
      } catch (err) {
        console.error('Fetch transactions error:', err);
        toast.error('Errore nel caricamento delle transazioni');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleDownloadReceipt = async (tx: Transaction) => {
    setDownloadingId(tx.id);
    try {
      const result = await downloadReceiptPdf(tx.id);
      if (result.pdf_base64) {
        // Decode base64 and trigger download
        const byteCharacters = atob(result.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scontrino_${format(new Date(tx.created_at || ''), 'yyyyMMdd_HHmm')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Scontrino scaricato');
      } else {
        toast.info(result.message || 'Scontrino non ancora disponibile da Fiskaly');
      }
    } catch (err) {
      console.error('Download receipt error:', err);
      toast.error('Errore nel download dello scontrino');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'bg-success text-foreground';
      case 'PENDING': return 'bg-warning text-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CREDIT_TOPUP': return 'Ricarica crediti';
      case 'WASH_SERVICE': return 'Lavaggio';
      case 'GUEST_WASH': return 'Lavaggio ospite';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'CREDIT_TOPUP' ? Coins : CreditCard;
  };

  const hasReceipt = (tx: Transaction) => {
    return tx.fiscal_doc_url && tx.fiscal_doc_url.startsWith('fiskaly:');
  };

  const renderTransaction = (tx: Transaction) => {
    const TypeIcon = getTypeIcon(tx.transaction_type);
    const isDownloading = downloadingId === tx.id;

    return (
      <Card key={tx.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-foreground">
              <TypeIcon className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">{getTypeLabel(tx.transaction_type)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{tx.created_at ? format(new Date(tx.created_at), 'dd MMM yyyy') : '-'}</span>
              <Clock className="w-3.5 h-3.5 ml-1" />
              <span>{tx.created_at ? format(new Date(tx.created_at), 'HH:mm') : '-'}</span>
            </div>
            {tx.station_id && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-light">{tx.station_id}</span>
              </div>
            )}
          </div>
          <div className="text-right space-y-2">
            <div className="text-lg font-bold text-foreground">€{tx.total_value.toFixed(2)}</div>
            {tx.status && (
              <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
            )}
            {hasReceipt(tx) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-primary"
                onClick={() => handleDownloadReceipt(tx)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                Scontrino
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

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

        <div className="space-y-3">
          {transactions.length > 0 ? transactions.map(renderTransaction) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground font-light">Nessuna transazione</p>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default History;
