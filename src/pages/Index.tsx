import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Play, LogIn, Droplets, Wind, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();

  const hasCredits = (profile?.credits || 0) > 0;

  const handleActivateService = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!hasCredits) {
      navigate('/credits');
      return;
    }
    
    // Navigate to map to select a station
    navigate('/map');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-center">
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {t('heroTitle')}
          </h1>
        </div>

        {/* User Credits Display - Circle */}
        {user && (
          <div className="flex justify-center">
            <div 
              className="w-36 h-36 rounded-full bg-gradient-to-br from-primary to-sky border-4 border-primary/30 flex flex-col items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate('/credits')}
            >
              <span className="text-4xl font-bold text-primary-foreground">{profile?.credits || 0}</span>
              <span className="text-sm text-primary-foreground/80 font-medium">{t('yourCredits')}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!loading && (
            user ? (
              <Button 
                onClick={handleActivateService} 
                variant="default" 
                size="lg" 
                className="w-full h-14 text-base"
              >
                <Play className="w-5 h-5" />
                {hasCredits ? t('activateService') : t('buyCreditsFirst')}
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/login')} 
                variant="default" 
                size="lg" 
                className="w-full h-14 text-base"
              >
                <LogIn className="w-5 h-5" />
                {t('loginToActivate')}
              </Button>
            )
          )}

          <Button 
            onClick={() => navigate('/map')} 
            variant="outline" 
            size="lg" 
            className="w-full h-14 text-base"
          >
            <MapPin className="w-5 h-5" />
            {t('findStations')}
          </Button>
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