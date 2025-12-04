import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Home, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    // Refresh profile to get updated credits
    refreshProfile();
  }, [refreshProfile]);

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