import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { StationIdentityBlock } from '@/components/station/StationIdentityBlock';
import { MapPreview } from '@/components/station/MapPreview';
import { ActionButtons } from '@/components/station/ActionButtons';
import { SafetyInfo } from '@/components/station/SafetyInfo';
import { AboutStation } from '@/components/station/AboutStation';
import { useStation } from '@/hooks/useStations';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

const StationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: station, isLoading, error } = useStation(id);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !station) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-20">
          <p className="text-lg font-bold text-foreground">{t('stationNotFound')}</p>
          <Button onClick={() => navigate('/')} variant="outline" className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
            {t('backToHome')}
          </Button>
        </div>
      </AppShell>
    );
  }

  const status = station.status as 'available' | 'busy' | 'offline';

  return (
    <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Station Identity */}
        <div className="animate-fade-in">
          <StationIdentityBlock
            name={station.name}
            status={status}
          />
        </div>

        {/* Map Preview */}
        <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <MapPreview
            stationName={station.name}
            address={station.address}
            lat={station.lat}
            lng={station.lng}
          />
        </div>

        {/* Action Buttons with Pricing */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <ActionButtons
            isDisabled={status === 'offline'}
            stationId={station.id}
            stationName={station.name}
            price={station.price_per_session}
            currency={station.currency}
            durationMinutes={station.duration_minutes}
          />
        </div>

        {/* Safety Info */}
        <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <SafetyInfo />
        </div>

        {/* About Station */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <AboutStation
            location={station.location}
            address={station.address}
            lat={station.lat}
            lng={station.lng}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default StationDetail;
