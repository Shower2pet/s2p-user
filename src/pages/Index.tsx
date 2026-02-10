import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStations } from '@/hooks/useStations';
import { useWallets } from '@/hooks/useWallet';
import { branding } from '@/config/branding';
import { Play, LogIn, MapPin, Unlock, ChevronRight, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const { data: stations } = useStations();
  const { data: wallets } = useWallets();
  const [stationCode, setStationCode] = useState('');
  const [showUnlockInput, setShowUnlockInput] = useState(false);

  const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;

  const handleUnlockStation = () => {
    if (!stationCode.trim()) {
      toast.error(t('enterStationCode'));
      return;
    }
    const station = stations?.find(s => s.id.toLowerCase() === stationCode.trim().toLowerCase());
    if (station) {
      navigate(`/s/${station.id}`);
      setStationCode('');
      setShowUnlockInput(false);
    } else {
      toast.error(t('stationNotFound'));
    }
  };

  return (
    <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero Title */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="text-2xl font-bold text-primary leading-tight">{t('heroTitle')}</h1>
        </div>

        {/* User Wallet Display */}
        {user && (
          <Card
            className="relative overflow-hidden p-6 rounded-3xl shadow-floating cursor-pointer hover:shadow-glow-primary transition-all duration-300 animate-slide-up bg-gradient-to-br from-card via-card to-sky/10"
            onClick={() => navigate('/profile')}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-sky flex items-center justify-center shadow-lg">
                  <Coins className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                    {t('yourCredits')}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-bold text-primary">€{totalBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Main CTA */}
        <Card className="p-6 rounded-3xl shadow-floating animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!loading && (user ? (
            <Button onClick={() => navigate('/map')} size="lg" className="w-full h-14 text-base rounded-full shadow-glow-primary hover:scale-[1.02] transition-all duration-300">
              <Play className="w-5 h-5" /> {t('activateService')}
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')} size="lg" className="w-full h-14 text-base rounded-full shadow-glow-primary hover:scale-[1.02] transition-all duration-300">
              <LogIn className="w-5 h-5" /> {t('loginToActivate')}
            </Button>
          ))}
          {!user && (
            <p className="text-center text-sm text-muted-foreground mt-4">{t('loginAndUseCredits')}</p>
          )}
        </Card>

        {/* Secondary Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button onClick={() => navigate('/map')} variant="outline" size="lg" className="w-full h-14 text-base rounded-full bg-card shadow-lifted hover:shadow-floating transition-all duration-300 border-0">
            <MapPin className="w-5 h-5 text-primary" /> {t('findStations')}
          </Button>

          {!showUnlockInput ? (
            <Button onClick={() => setShowUnlockInput(true)} variant="ghost" size="lg" className="w-full h-14 text-base rounded-full bg-sky/20 hover:bg-sky/30 text-primary transition-all duration-300">
              <Unlock className="w-5 h-5" /> {t('unlockStation')}
            </Button>
          ) : (
            <Card className="p-5 rounded-3xl shadow-floating space-y-4">
              <p className="text-sm text-muted-foreground">{t('enterStationCodeDesc')}</p>
              <div className="flex gap-3">
                <Input value={stationCode} onChange={(e) => setStationCode(e.target.value)}
                  placeholder={t('stationCodePlaceholder')} className="flex-1 h-12 rounded-xl text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlockStation()} />
                <Button onClick={handleUnlockStation} className="h-12 px-6 rounded-xl">{t('go')}</Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setShowUnlockInput(false); setStationCode(''); }}>
                {t('cancel')}
              </Button>
            </Card>
          )}
        </div>

        {/* How It Works */}
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
