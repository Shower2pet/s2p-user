import { AppShell } from '@/components/layout/AppShell';
import { StationStatusBadge } from '@/components/station/StationStatusBadge';
import { PriceCard } from '@/components/station/PriceCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { branding } from '@/config/branding';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { CreditCard, LogIn, Droplets, Wind, Shield, CheckCircle, Sparkles, PawPrint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import shower2petLogo from '@/assets/shower2pet-logo.png';

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
        {/* Language Switcher */}
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-sky to-primary/80 p-6 text-primary-foreground">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <PawPrint className="w-full h-full" />
          </div>
          <div className="absolute bottom-0 left-0 w-24 h-24 opacity-10">
            <Sparkles className="w-full h-full" />
          </div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center p-2">
              <img src={shower2petLogo} alt="Shower2Pet" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">
                {branding.station.name}
              </h1>
              <p className="text-sm opacity-90 font-light">
                {branding.clientName}
              </p>
              <div className="mt-2">
                <StationStatusBadge status={stationStatus} className="bg-white/20 backdrop-blur-sm" />
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm font-light opacity-90">
              🐕 {t('stationDescription')}
            </p>
          </div>
        </div>

        {/* Station Description */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-sky/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t('stationDescription')}
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                {t('stationSubtitle')}
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
            {t('payNowWithCard')}
          </Button>

          <Button
            onClick={handleLoginToUseCredits}
            variant="sky"
            size="lg"
            className="w-full"
          >
            <LogIn className="w-5 h-5" />
            {t('loginAndUseCredits')}
          </Button>
        </div>

        {/* How It Works */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            {t('howItWorks')}
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-bold text-foreground">{t('step1Title')}</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t('step1Desc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-bold text-foreground">{t('step2Title')}</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t('step2Desc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-bold text-foreground">{t('step3Title')}</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t('step3Desc')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Safety Info */}
        <Card className="p-6 bg-sand/10 border-sand">
          <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sand-foreground" />
            {t('safetyRecommendations')}
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground font-light">
            <li>• {t('safety1')}</li>
            <li>• {t('safety2')}</li>
            <li>• {t('safety3')}</li>
            <li>• {t('safety4')}</li>
          </ul>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <Droplets className="w-8 h-8 text-sky mx-auto mb-2" />
            <p className="font-bold text-foreground">{t('waterSystem')}</p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              {t('adjustablePressure')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <Wind className="w-8 h-8 text-sky mx-auto mb-2" />
            <p className="font-bold text-foreground">{t('petDryer')}</p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              {t('safeTemperature')}
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
