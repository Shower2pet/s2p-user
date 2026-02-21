import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Home, Coins, FileDown, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { downloadReceiptPdf } from '@/services/transactionService';
import { format } from 'date-fns';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { refreshProfile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [receiptAvailable, setReceiptAvailable] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Check if receipt is available for this payment
  useEffect(() => {
    if (!user) return;

    const checkReceipt = async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) return;

      // Poll a few times for the receipt to be generated (webhook + generate-receipt are async)
      for (let i = 0; i < 5; i++) {
        const { data: tx } = await supabase
          .from('transactions')
          .select('id, fiscal_doc_url')
          .eq('stripe_payment_id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (tx?.fiscal_doc_url?.startsWith('fiskaly:')) {
          setTransactionId(tx.id);
          setReceiptAvailable(true);
          return;
        }

        // Wait 2s before retrying
        await new Promise(r => setTimeout(r, 2000));
      }
    };

    checkReceipt();
  }, [user, searchParams]);

  const handleDownloadReceipt = async () => {
    if (!transactionId) return;
    setDownloading(true);
    try {
      const result = await downloadReceiptPdf(transactionId);
      if (result.pdf_base64) {
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
        a.download = `scontrino_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Scontrino scaricato');
      } else {
        toast.info(result.message || 'Scontrino non ancora disponibile');
      }
    } catch (err) {
      console.error('Download receipt error:', err);
      toast.error('Errore nel download dello scontrino');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('paymentSuccessful')}
          </h1>
          <p className="text-lg text-muted-foreground font-light">
            {t('creditsAddedSuccess')}
          </p>
        </div>

        <Card className="p-6 space-y-4 bg-gradient-to-br from-success/5 to-mint/5 border-success">
          <div className="flex items-center justify-center gap-3">
            <Coins className="w-8 h-8 text-primary" />
            <p className="text-lg font-medium text-foreground">
              {t('thankYou')}
            </p>
          </div>
        </Card>

        {receiptAvailable && (
          <Button
            onClick={handleDownloadReceipt}
            variant="outline"
            size="lg"
            className="w-full gap-2"
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileDown className="w-5 h-5" />
            )}
            Scarica scontrino fiscale
          </Button>
        )}

        <Button
          onClick={() => navigate('/')}
          variant="default"
          size="lg"
          className="w-full"
        >
          <Home className="w-5 h-5" />
          {t('backToHome')}
        </Button>

        <Card className="p-4 bg-sky/10 border-sky">
          <p className="text-sm text-center text-muted-foreground font-light">
            ℹ️ {t('creditDeductionInfo')}
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default PaymentSuccess;
