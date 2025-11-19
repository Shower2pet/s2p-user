import { AppShell } from '@/components/layout/AppShell';
import { StationStatusBadge } from '@/components/station/StationStatusBadge';
import { PriceCard } from '@/components/station/PriceCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { branding } from '@/config/branding';
import { CreditCard, LogIn, Droplets, Wind, Shield, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const stationStatus: 'available' | 'busy' | 'offline' = 'available';

  const handlePayNow = () => {
    navigate('/payment');
  };

  const handleLoginToUseCredits = () => {
    navigate('/login');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Station Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {branding.station.name}
          </h1>
          <p className="text-muted-foreground font-light">
            {branding.clientName}
          </p>
          <StationStatusBadge status={stationStatus} className="inline-flex" />
        </div>

        {/* Station Description */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-sky/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t('home.description')}
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                {t('home.professionalDesc')}
              </p>
            </div>
          </div>
        </Card>

        {/* Price Card */}
        <PriceCard />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handlePayNow}
            variant="default"
            size="lg"
            className="w-full"
            disabled={stationStatus !== 'available'}
          >
            <CreditCard className="w-5 h-5" />
            {t('home.payNow')}
          </Button>

          <Button
            onClick={handleLoginToUseCredits}
            variant="sky"
            size="lg"
            className="w-full"
          >
            <LogIn className="w-5 h-5" />
            {t('home.loginCredits')}
          </Button>
        </div>

        {/* How It Works */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            {t('home.howItWorks')}
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-bold text-foreground">{t('home.step1Title')}</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t('home.step1Desc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-bold text-foreground">{t('home.step2Title')}</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t('home.step2Desc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-bold text-foreground">{t('home.step3Title')}</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t('home.step3Desc')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Safety Info */}
        <Card className="p-6 bg-sand/10 border-sand">
          <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sand-foreground" />
            {t('home.safetyTitle')}
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground font-light">
            <li>• {t('home.safety1')}</li>
            <li>• {t('home.safety2')}</li>
            <li>• {t('home.safety3')}</li>
            <li>• {t('home.safety4')}</li>
          </ul>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <Droplets className="w-8 h-8 text-sky mx-auto mb-2" />
            <p className="font-bold text-foreground">{t('home.waterSystem')}</p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              {t('home.adjustablePressure')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <Wind className="w-8 h-8 text-sky mx-auto mb-2" />
            <p className="font-bold text-foreground">{t('home.petDryer')}</p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              {t('home.safeTemperature')}
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
