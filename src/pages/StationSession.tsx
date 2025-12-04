import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CountdownTimer } from '@/components/station/CountdownTimer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useStation } from '@/hooks/useStations';
import { CheckCircle, Home } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const StationSession = () => {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();
  const { t } = useLanguage();
  const [sessionComplete, setSessionComplete] = useState(false);
  const { data: station, isLoading } = useStation(stationId);

  if (isLoading) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-48 w-48 mx-auto rounded-full" />
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

  const initialSeconds = station.duration_minutes * 60;

  const handleSessionComplete = () => {
    setSessionComplete(true);
  };

  if (sessionComplete) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('sessionFinished')}
            </h1>
            <p className="text-lg text-muted-foreground font-light">
              {t('sessionFinishedDesc')}
            </p>
          </div>

          <Card className="p-6 text-center bg-gradient-to-br from-success/5 to-mint/5 border-success">
            <p className="text-foreground font-light">
              {t('thankYouForUsing')} <strong>{station.name}</strong>
            </p>
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
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {station.name}
          </h1>
          <Badge variant="default" className="bg-success text-success-foreground">
            {t('serviceActive')}
          </Badge>
        </div>

        <CountdownTimer
          initialSeconds={initialSeconds}
          onComplete={handleSessionComplete}
        />

        <Card className="p-4 bg-sky/10 border-sky">
          <p className="text-sm text-center text-muted-foreground font-light">
            ℹ️ {t('sessionInProgress')}
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default StationSession;
