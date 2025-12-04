import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { useLanguage } from '@/hooks/useLanguage';
import { CheckCircle, Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const startTime = new Date();

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
            {t('thankYou')}
          </p>
        </div>

        <Card className="p-6 space-y-4 bg-gradient-to-br from-success/5 to-mint/5 border-success">
          <h2 className="text-xl font-bold text-foreground">{t('sessionDetails')}</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-light">{t('station')}</p>
                <p className="font-bold text-foreground">{branding.station.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-light">{t('date')}</p>
                <p className="font-bold text-foreground">{format(startTime, 'MMMM dd, yyyy')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-light">{t('startTime')}</p>
                <p className="font-bold text-foreground">{format(startTime, 'HH:mm')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-light">{t('duration')}</p>
                <p className="font-bold text-foreground">{branding.station.durationMinutes} {t('minutes')}</p>
              </div>
            </div>
          </div>
        </Card>

        <Button
          onClick={() => navigate('/session/active')}
          variant="default"
          size="lg"
          className="w-full"
        >
          {t('goToSession')}
          <ArrowRight className="w-5 h-5" />
        </Button>

        <Card className="p-4 bg-sky/10 border-sky">
          <p className="text-sm text-center text-muted-foreground font-light">
            ℹ️ {t('thankYou')}
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default PaymentSuccess;
