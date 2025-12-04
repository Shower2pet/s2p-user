import { AppShell } from '@/components/layout/AppShell';
import { StationStatusBadge } from '@/components/station/StationStatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStation } from '@/hooks/useStations';
import { Play, Droplets, Wind, LogIn, CreditCard, MapPin } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const Station = () => {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();
  const { t } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: station, isLoading } = useStation(stationId);

  if (isLoading) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!station) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('stationNotFound')}</h1>
          <Button onClick={() => navigate('/map')} className="mt-4">
            {t('backToMap')}
          </Button>
        </div>
      </AppShell>
    );
  }

  const creditsNeeded = station.duration_minutes / 5;
  const hasEnoughCredits = (profile?.credits || 0) >= creditsNeeded;

  const handleActivateService = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!hasEnoughCredits) {
      navigate('/credits');
      return;
    }
    
    navigate(`/${stationId}/activate`);
  };

  const handlePayWithCard = () => {
    navigate(`/${stationId}/payment`);
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Station Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {station.name}
          </h1>
          <p className="text-muted-foreground">{station.location}</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <StationStatusBadge status={station.status} />
        </div>

        {/* Location & Directions Card */}
        <Card className="p-4 border border-border">
          <h3 className="text-sm font-bold text-foreground mb-2">{t('locationInfo')}</h3>
          <p className="text-sm text-muted-foreground mb-3">{station.address}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {t('getDirections')}
          </Button>
        </Card>

        {/* Service Info Card */}
        <Card className="p-5 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="text-center py-2">
            <div className="text-4xl font-bold text-primary mb-1">
              {creditsNeeded} {t('credits')}
            </div>
            <p className="text-sm text-muted-foreground">
              {station.duration_minutes} {t('minutes')} {t('ofService')}
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!authLoading && (
            user ? (
              <Button 
                onClick={handleActivateService} 
                variant="default" 
                size="lg" 
                className="w-full h-14 text-base" 
                disabled={station.status !== 'available'}
              >
                <Play className="w-5 h-5" />
                {hasEnoughCredits ? t('activateService') : t('buyCreditsFirst')}
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
            onClick={handlePayWithCard} 
            variant="outline" 
            size="lg" 
            className="w-full h-14 text-base" 
            disabled={station.status !== 'available'}
          >
            <CreditCard className="w-5 h-5" />
            {t('payNowWithCard')}
          </Button>
        </div>

        {/* User Credits Display */}
        {user && (
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('yourCredits')}</span>
              <span className="font-bold text-foreground">{profile?.credits || 0} {t('credits')}</span>
            </div>
          </Card>
        )}

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

        {/* How It Works */}
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

export default Station;
