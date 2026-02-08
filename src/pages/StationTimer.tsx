import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dog, Droplets, Wind, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useStation } from '@/hooks/useStations';
import logo from '@/assets/shower2pet-logo.png';

const StationTimer = () => {
  const { id } = useParams<{ id: string }>();
  const { data: station } = useStation(id);
  const totalSeconds = (station?.duration_minutes || 5) * 60;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Update total when station loads
  useEffect(() => {
    if (station) {
      setSecondsLeft(station.duration_minutes * 60);
    }
  }, [station]);

  useEffect(() => {
    if (!isActive || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const isFinished = secondsLeft <= 0;

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-[hsl(206,100%,20%)] flex flex-col">
      <div className="mx-auto max-w-[480px] w-full flex-1 flex flex-col px-4 py-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Shower2Pet" className="h-10 object-contain" />
        </div>

        {/* Station name */}
        {station && (
          <p className="text-center text-primary-foreground/80 text-sm font-light mb-4">
            {station.name}
          </p>
        )}

        {/* Timer Circle */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            <svg className="w-64 h-64 transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="12"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                fill="none"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isFinished ? (
                <CheckCircle className="h-12 w-12 text-primary-foreground/80 mb-2" />
              ) : (
                <Dog className="h-12 w-12 text-primary-foreground/80 mb-2" />
              )}
              <span className="text-5xl font-bold text-primary-foreground tabular-nums">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              <span className="text-primary-foreground/80 mt-1 text-sm">
                {isFinished ? t('sessionFinished') : t('serviceActive')}
              </span>
            </div>
          </div>

          {/* Status pills */}
          <div className="mt-8 flex gap-4">
            <div className="flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-2">
              <Droplets className="h-5 w-5 text-primary-foreground" />
              <span className="text-sm text-primary-foreground">{t('waterSystem')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-2">
              <Wind className="h-5 w-5 text-primary-foreground" />
              <span className="text-sm text-primary-foreground">{t('petDryer')}</span>
            </div>
          </div>
        </div>

        {/* Finish Button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full h-14 text-base rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
          onClick={handleFinish}
        >
          {isFinished ? t('backToHome') : t('back')}
        </Button>
      </div>
    </div>
  );
};

export default StationTimer;
