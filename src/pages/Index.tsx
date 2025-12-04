import { AppShell } from '@/components/layout/AppShell';
import { StationStatusBadge } from '@/components/station/StationStatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { branding } from '@/config/branding';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, LogIn, Droplets, Wind, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import shower2petLogo from '@/assets/shower2pet-logo.png';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const stationStatus: 'available' | 'busy' | 'offline' = 'available';

  const handlePayNow = () => {
    navigate('/payment');
  };

  const handleLoginToUseCredits = () => {
    navigate('/login');
  };

  const handleGoToCredits = () => {
    navigate('/credits');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header con logo */}
        <div className="flex items-center justify-center">
          <img src={shower2petLogo} alt="Shower2Pet" className="w-12 h-12 object-contain" />
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {t('heroTitle')}
          </h1>
        </div>

        {/* Status Card */}
        <Card className="p-5 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-foreground">{branding.station.name}</p>
              <p className="text-xs text-muted-foreground">{branding.clientName}</p>
            </div>
            <StationStatusBadge status={stationStatus} />
          </div>
          
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-primary mb-1">
              {branding.station.currency}{branding.station.pricePerSession.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              {branding.station.durationMinutes} {t('minutes')}
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handlePayNow}
            variant="default"
            size="lg"
            className="w-full h-14 text-base"
            disabled={stationStatus !== 'available'}
          >
            <CreditCard className="w-5 h-5" />
            {t('payNowWithCard')}
          </Button>

          {!loading && (
            user ? (
              <Button
                onClick={handleGoToCredits}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base"
              >
                <User className="w-5 h-5" />
                {t('useMyCredits')}
              </Button>
            ) : (
              <Button
                onClick={handleLoginToUseCredits}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base"
              >
                <LogIn className="w-5 h-5" />
                {t('loginAndUseCredits')}
              </Button>
            )
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center bg-muted/30">
            <Droplets className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{t('waterSystem')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('adjustablePressure')}
            </p>
          </Card>
          <Card className="p-4 text-center bg-muted/30">
            <Wind className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{t('petDryer')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('safeTemperature')}
            </p>
          </Card>
        </div>

        {/* How It Works - Compact */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">{t('howItWorks')}</h3>
          <div className="flex justify-between text-center">
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-1">1</div>
              <p className="text-xs text-muted-foreground">{t('step1Title')}</p>
            </div>
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-1">2</div>
              <p className="text-xs text-muted-foreground">{t('step2Title')}</p>
            </div>
            <div className="flex-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-1">3</div>
              <p className="text-xs text-muted-foreground">{t('step3Title')}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Index;
