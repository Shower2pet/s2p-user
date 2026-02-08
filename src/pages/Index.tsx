import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStations } from '@/hooks/useStations';
import { branding } from '@/config/branding';
import { Play, LogIn, MapPin, Unlock, ChevronRight, Infinity, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
const Index = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const {
    user,
    profile,
    loading
  } = useAuth();
  const {
    data: stations
  } = useStations();
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
      navigate(`/s/${station.id}`);
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
  return <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero Title */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="text-2xl font-bold text-primary leading-tight">
            {t('heroTitle')}
          </h1>
        </div>

        {/* User Credits Display - Beautiful Card with Dog Theme */}
        {user && <Card className="relative overflow-hidden p-6 rounded-3xl shadow-floating cursor-pointer hover:shadow-glow-primary transition-all duration-300 animate-slide-up bg-gradient-to-br from-card via-card to-sky/10" onClick={() => navigate('/credits')}>
            {/* Decorative paw prints */}
            <div className="absolute top-2 right-8 opacity-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <ellipse cx="12" cy="17" rx="4" ry="5"/>
                <ellipse cx="5" cy="10" rx="2.5" ry="3"/>
                <ellipse cx="19" cy="10" rx="2.5" ry="3"/>
                <ellipse cx="8" cy="6" rx="2" ry="2.5"/>
                <ellipse cx="16" cy="6" rx="2" ry="2.5"/>
              </svg>
            </div>
            <div className="absolute bottom-4 right-4 opacity-5">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <ellipse cx="12" cy="17" rx="4" ry="5"/>
                <ellipse cx="5" cy="10" rx="2.5" ry="3"/>
                <ellipse cx="19" cy="10" rx="2.5" ry="3"/>
                <ellipse cx="8" cy="6" rx="2" ry="2.5"/>
                <ellipse cx="16" cy="6" rx="2" ry="2.5"/>
              </svg>
            </div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-sky flex items-center justify-center shadow-lg">
                  {/* Dog bone icon */}
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                    <path d="M15.59 3.41a2 2 0 0 0-2.83 0l-8.5 8.5a2 2 0 0 0 0 2.83l2.83 2.83a2 2 0 0 0 2.83 0l8.5-8.5a2 2 0 0 0 0-2.83l-2.83-2.83z"/>
                    <circle cx="6.5" cy="6.5" r="2.5"/>
                    <circle cx="17.5" cy="17.5" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                    {t('yourCredits')}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-bold text-primary">{profile?.credits || 0}</p>
                    <span className="text-sm text-muted-foreground font-medium">crediti</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground mt-1">Ricarica</span>
              </div>
            </div>
          </Card>}

        {/* Main CTA - Floating Card */}
        <Card className="p-6 rounded-3xl shadow-floating animate-slide-up" style={{
        animationDelay: '0.1s'
      }}>
          {!loading && (user ? <Button onClick={handleActivateService} size="lg" className="w-full h-14 text-base rounded-full shadow-glow-primary hover:scale-[1.02] transition-all duration-300">
                <Play className="w-5 h-5" />
                {hasCredits ? t('activateService') : t('buyCreditsFirst')}
              </Button> : <Button onClick={() => navigate('/login')} size="lg" className="w-full h-14 text-base rounded-full shadow-glow-primary hover:scale-[1.02] transition-all duration-300">
                <LogIn className="w-5 h-5" />
                {t('loginToActivate')}
              </Button>)}
          
          {!user && <p className="text-center text-sm text-muted-foreground mt-4">
              {t('loginAndUseCredits')}
            </p>}
        </Card>

        {/* Secondary Actions */}
        <div className="space-y-3 animate-slide-up" style={{
        animationDelay: '0.2s'
      }}>
          <Button onClick={() => navigate('/map')} variant="outline" size="lg" className="w-full h-14 text-base rounded-full bg-card shadow-lifted hover:shadow-floating transition-all duration-300 border-0">
            <MapPin className="w-5 h-5 text-primary" />
            {t('findStations')}
          </Button>

          {/* Unlock Station */}
          {!showUnlockInput ? <Button onClick={() => setShowUnlockInput(true)} variant="ghost" size="lg" className="w-full h-14 text-base rounded-full bg-sky/20 hover:bg-sky/30 text-primary transition-all duration-300">
              <Unlock className="w-5 h-5" />
              {t('unlockStation')}
            </Button> : <Card className="p-5 rounded-3xl shadow-floating space-y-4">
              <p className="text-sm text-muted-foreground">{t('enterStationCodeDesc')}</p>
              <div className="flex gap-3">
                <Input value={stationCode} onChange={e => setStationCode(e.target.value)} placeholder={t('stationCodePlaceholder')} className="flex-1 h-12 rounded-xl text-base" onKeyDown={e => e.key === 'Enter' && handleUnlockStation()} />
                <Button onClick={handleUnlockStation} className="h-12 px-6 rounded-xl">
                  {t('go')}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => {
            setShowUnlockInput(false);
            setStationCode('');
          }}>
                {t('cancel')}
              </Button>
            </Card>}
        </div>

        {/* Unlimited Plan Highlight */}
        {(() => {
          const unlimitedPlan = branding.subscriptionPlans.find(p => p.id === 'unlimited');
          return unlimitedPlan && (
            <Card 
              className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-primary via-primary to-sky border-2 border-primary shadow-glow-primary cursor-pointer hover:scale-[1.02] transition-all duration-300 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
              onClick={() => navigate('/credits#subscriptions')}
            >
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 bg-warning text-warning-foreground text-xs font-bold rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  PREMIUM
                </span>
              </div>
              <div className="flex items-center gap-4 text-primary-foreground">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Infinity className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{unlimitedPlan.name}</h3>
                  <p className="text-xs opacity-90">Solo €{unlimitedPlan.price}/mese</p>
                </div>
                <ChevronRight className="w-5 h-5 opacity-80" />
              </div>
            </Card>
          );
        })()}

        {/* How It Works - Soft Card */}
        <Card className="p-6 rounded-3xl shadow-lifted animate-slide-up" style={{
        animationDelay: '0.4s'
      }}>
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
    </AppShell>;
};
export default Index;