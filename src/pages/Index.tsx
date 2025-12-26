import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStations } from '@/hooks/useStations';
import { Play, LogIn, Droplets, Wind, MapPin, Unlock, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const { data: stations } = useStations();
  const [stationCode, setStationCode] = useState('');
  const [showUnlockInput, setShowUnlockInput] = useState(false);

  const hasCredits = (profile?.credits || 0) > 0;

  const handleUnlockStation = () => {
    if (!stationCode.trim()) {
      toast.error(t('enterStationCode'));
      return;
    }
    
    const station = stations?.find(s => s.id.toLowerCase() === stationCode.trim().toLowerCase());
    
    if (station) {
      window.open(`https://shower-pet-station.lovable.app/${station.id}`, '_blank');
      setStationCode('');
      setShowUnlockInput(false);
    } else {
      toast.error(t('stationNotFound'));
    }
  };

  const handleActivateService = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!hasCredits) {
      navigate('/credits');
      return;
    }
    
    navigate('/map');
  };

  return (
    <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero Title */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="text-2xl font-bold text-primary leading-tight">
            {t('heroTitle')}
          </h1>
        </div>

        {/* User Credits Display - Floating Card */}
        {user && (
          <Card 
            className="p-6 rounded-3xl shadow-floating cursor-pointer hover:shadow-glow-primary transition-all duration-300 animate-slide-up"
            onClick={() => navigate('/credits')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-sky flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{t('yourCredits')}</p>
                  <p className="text-4xl font-bold text-primary">{profile?.credits || 0}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        )}

        {/* Main CTA - Floating Card */}
        <Card className="p-6 rounded-3xl shadow-floating animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!loading && (
            user ? (
              <Button 
                onClick={handleActivateService} 
                size="lg" 
                className="w-full h-14 text-base rounded-full shadow-glow-primary hover:scale-[1.02] transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                {hasCredits ? t('activateService') : t('buyCreditsFirst')}
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/login')} 
                size="lg" 
                className="w-full h-14 text-base rounded-full shadow-glow-primary hover:scale-[1.02] transition-all duration-300"
              >
                <LogIn className="w-5 h-5" />
                {t('loginToActivate')}
              </Button>
            )
          )}
          
          {!user && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t('loginAndUseCredits')}
            </p>
          )}
        </Card>

        {/* Secondary Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button 
            onClick={() => navigate('/map')} 
            variant="outline" 
            size="lg" 
            className="w-full h-14 text-base rounded-full bg-card shadow-lifted hover:shadow-floating transition-all duration-300 border-0"
          >
            <MapPin className="w-5 h-5 text-primary" />
            {t('findStations')}
          </Button>

          {/* Unlock Station */}
          {!showUnlockInput ? (
            <Button 
              onClick={() => setShowUnlockInput(true)} 
              variant="ghost" 
              size="lg" 
              className="w-full h-14 text-base rounded-full bg-sky/20 hover:bg-sky/30 text-primary transition-all duration-300"
            >
              <Unlock className="w-5 h-5" />
              {t('unlockStation')}
            </Button>
          ) : (
            <Card className="p-5 rounded-3xl shadow-floating space-y-4">
              <p className="text-sm text-muted-foreground">{t('enterStationCodeDesc')}</p>
              <div className="flex gap-3">
                <Input
                  value={stationCode}
                  onChange={(e) => setStationCode(e.target.value)}
                  placeholder={t('stationCodePlaceholder')}
                  className="flex-1 h-12 rounded-xl text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlockStation()}
                />
                <Button onClick={handleUnlockStation} className="h-12 px-6 rounded-xl">
                  {t('go')}
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-muted-foreground"
                onClick={() => {
                  setShowUnlockInput(false);
                  setStationCode('');
                }}
              >
                {t('cancel')}
              </Button>
            </Card>
          )}
        </div>

        {/* Features - Soft UI Cards */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <Card className="p-5 text-center rounded-3xl shadow-lifted hover:shadow-floating transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-sky/30 flex items-center justify-center mx-auto mb-3">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('waterSystem')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('adjustablePressure')}
            </p>
          </Card>
          <Card className="p-5 text-center rounded-3xl shadow-lifted hover:shadow-floating transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-sky/30 flex items-center justify-center mx-auto mb-3">
              <Wind className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('petDryer')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('safeTemperature')}
            </p>
          </Card>
        </div>

        {/* How It Works - Soft Card */}
        <Card className="p-6 rounded-3xl shadow-lifted animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-base font-bold text-foreground mb-4">{t('howItWorks')}</h3>
          <div className="flex justify-between text-center">
            <div className="flex-1">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">1</div>
              <p className="text-xs text-muted-foreground leading-tight">{t('step1Title')}</p>
            </div>
            <div className="flex-1">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">2</div>
              <p className="text-xs text-muted-foreground leading-tight">{t('step2Title')}</p>
            </div>
            <div className="flex-1">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">3</div>
              <p className="text-xs text-muted-foreground leading-tight">{t('step3Title')}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Index;
