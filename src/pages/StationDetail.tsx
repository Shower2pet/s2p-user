import { useParams, useNavigate } from 'react-router-dom';
import { CoBrandingHeader } from '@/components/layout/CoBrandingHeader';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-bold text-foreground">{t('stationNotFound')}</p>
        <Button onClick={() => navigate('/')} variant="outline" className="rounded-full">
          <ArrowLeft className="w-4 h-4" />
          {t('backToHome')}
        </Button>
      </div>
    );
  }

  const status = station.status as 'available' | 'busy' | 'offline';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[480px] pb-8">
        {/* Co-branding Header */}
        <CoBrandingHeader />

        {/* Main Content */}
        <div className="space-y-4 px-4 pt-4">
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
      </div>
    </div>
  );
};

export default StationDetail;
