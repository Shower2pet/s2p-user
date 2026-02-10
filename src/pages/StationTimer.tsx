import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Dog, Droplets, Wind, CheckCircle, Star, AlertTriangle, ShowerHead, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { useStation, isShower } from '@/hooks/useStations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/shower2pet-logo.png';

type TubStep = 'rules' | 'timer' | 'cleanup' | 'courtesy' | 'sanitizing' | 'rating';
type ShowerStep = 'timer' | 'rating';
type WashStep = TubStep | ShowerStep;

const SANITIZE_SECONDS = 30;

interface WashSession {
  id: string;
  station_id: string;
  option_id: number;
  option_name: string;
  total_seconds: number;
  started_at: string;
  ends_at: string;
  step: string;
  status: string;
}

const StationTimer = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: station } = useStation(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const isShowerStation = station ? isShower(station) : false;
  const optionId = Number(searchParams.get('option') || 0);

  const [session, setSession] = useState<WashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WashStep>('timer');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [courtesySeconds, setCourtesySeconds] = useState(60);
  const [rating, setRating] = useState(0);
  const [sanitizeSeconds, setSanitizeSeconds] = useState(SANITIZE_SECONDS);

  // Fetch active session from DB
  useEffect(() => {
    if (!id || !user) return;

    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('wash_sessions')
        .select('*')
        .eq('station_id', id)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSession(data as WashSession);
        const now = Date.now();
        const endsAt = new Date(data.ends_at).getTime();
        const remaining = Math.max(0, Math.round((endsAt - now) / 1000));

        setStep(data.step as WashStep);

        if (data.step === 'timer') {
          if (remaining > 0) {
            setSecondsLeft(remaining);
            setIsActive(true);
          } else {
            setSecondsLeft(0);
            setIsActive(false);
            if (isShowerStation) {
              updateSessionStep(data.id, 'rating');
              setStep('rating');
            } else {
              updateSessionStep(data.id, 'cleanup');
              setStep('cleanup');
            }
          }
        }
      }
      setLoading(false);
    };

    fetchSession();
  }, [id, user, isShowerStation]);

  // Subscribe to Realtime updates on the session
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`wash_session_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wash_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as WashSession;
          setSession(updated);
          setStep(updated.step as WashStep);
          if (updated.status === 'COMPLETED') {
            setStep('rating');
            setIsActive(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Update session step in DB
  const updateSessionStep = async (sessionId: string, newStep: string, status?: string) => {
    const updates: any = { step: newStep };
    if (status) updates.status = status;
    await supabase
      .from('wash_sessions')
      .update(updates)
      .eq('id', sessionId);
  };

  // Main countdown timer (computed from ends_at)
  useEffect(() => {
    if (step !== 'timer' || !isActive || !session) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const endsAt = new Date(session.ends_at).getTime();
      const remaining = Math.max(0, Math.round((endsAt - now) / 1000));

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        setIsActive(false);
        if (isShowerStation) {
          setStep('rating');
          updateSessionStep(session.id, 'rating', 'COMPLETED');
        } else {
          setStep('cleanup');
          updateSessionStep(session.id, 'cleanup');
        }
      } else if (!isShowerStation && remaining === 120 && !warningShown) {
        toast.warning('⏰ Il tempo sta per scadere! Ricorda di sciacquare la vasca.', { duration: 8000 });
        setWarningShown(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, isActive, session, warningShown, isShowerStation]);

  // Courtesy timer (TUB only)
  useEffect(() => {
    if (step !== 'courtesy' || courtesySeconds <= 0) return;

    const interval = setInterval(() => {
      setCourtesySeconds((prev) => {
        if (prev <= 1) {
          setStep('cleanup');
          if (session) updateSessionStep(session.id, 'cleanup');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, courtesySeconds, session]);

  // Sanitizing countdown (TUB only, 30s)
  useEffect(() => {
    if (step !== 'sanitizing') return;
    setSanitizeSeconds(SANITIZE_SECONDS);

    const interval = setInterval(() => {
      setSanitizeSeconds((prev) => {
        if (prev <= 1) {
          setStep('rating');
          if (session) updateSessionStep(session.id, 'rating', 'COMPLETED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, session]);

  const totalSeconds = session?.total_seconds || 300;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const handleAcceptRules = () => {
    setStep('timer');
    setIsActive(true);
    if (session) updateSessionStep(session.id, 'timer');
  };

  const handleStopManual = () => {
    setIsActive(false);
    if (isShowerStation) {
      setStep('rating');
      if (session) updateSessionStep(session.id, 'rating', 'COMPLETED');
    } else {
      setStep('cleanup');
      if (session) updateSessionStep(session.id, 'cleanup');
    }
  };

  const handleCleanupResponse = (clean: boolean) => {
    if (clean) {
      // Client goes straight to rating, no sanitization wait
      setStep('rating');
      if (session) updateSessionStep(session.id, 'rating', 'COMPLETED');
    } else {
      setCourtesySeconds(60);
      setStep('courtesy');
      if (session) updateSessionStep(session.id, 'courtesy');
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  const StationIcon = isShowerStation ? ShowerHead : Dog;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-[hsl(206,100%,20%)] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-[hsl(206,100%,20%)] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-primary-foreground text-lg font-bold text-center">Nessuna sessione attiva trovata</p>
        <Button
          variant="outline"
          className="rounded-full bg-primary-foreground text-primary"
          onClick={() => navigate('/')}
        >
          Torna alla Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-[hsl(206,100%,20%)] flex flex-col">
      <div className="mx-auto max-w-[480px] w-full flex-1 flex flex-col px-4 py-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/90 rounded-2xl px-4 py-2">
            <img src={logo} alt="Shower2Pet" className="h-10 object-contain" />
          </div>
        </div>

        {/* Station name + type badge */}
        {station && (
          <div className="text-center mb-4">
            <p className="text-primary-foreground/80 text-sm font-light">
              {station.structure_name || station.id}
            </p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-foreground/20 text-primary-foreground">
              {station.type} — {isShowerStation ? '🚿 Doccia' : '🛁 Vasca'}
            </span>
          </div>
        )}

        {/* STEP: Rules (TUB only) */}
        {!isShowerStation && (
          <Dialog open={step === 'rules'} onOpenChange={() => {}}>
            <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>📋 Regolamento</DialogTitle>
                <DialogDescription>Leggi e accetta prima di iniziare</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>🐕 Tieni il cane al guinzaglio durante il lavaggio</p>
                <p>🚿 Controlla la temperatura dell'acqua prima di iniziare</p>
                <p>🧹 Lascia la vasca pulita dopo l'uso</p>
                <p>⚠️ Supervisiona sempre il tuo animale</p>
              </div>
              <DialogFooter>
                <Button onClick={handleAcceptRules} className="w-full" size="lg">
                  ✅ Accetto e Avvia
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* STEP: Timer */}
        {(step === 'timer' || step === 'courtesy') && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <svg className="w-64 h-64 transform -rotate-90">
                <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
                <circle
                  cx="128" cy="128" r="110" fill="none" stroke="white" strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 110}
                  strokeDashoffset={step === 'courtesy'
                    ? 2 * Math.PI * 110 * (courtesySeconds / 60)
                    : 2 * Math.PI * 110 * (1 - progress / 100)
                  }
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {step === 'courtesy' ? (
                  <AlertTriangle className="h-12 w-12 text-warning mb-2" />
                ) : (
                  <StationIcon className="h-12 w-12 text-primary-foreground/80 mb-2" />
                )}
                <span className="text-5xl font-bold text-primary-foreground tabular-nums">
                  {step === 'courtesy'
                    ? `0:${courtesySeconds.toString().padStart(2, '0')}`
                    : `${minutes}:${seconds.toString().padStart(2, '0')}`
                  }
                </span>
                <span className="text-primary-foreground/80 mt-1 text-sm">
                  {step === 'courtesy' ? 'Risciacquo gratuito' : t('serviceActive')}
                </span>
              </div>
            </div>

            {/* Status pills */}
            <div className="mt-8 flex gap-4">
              <div className="flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-2">
                <Droplets className="h-5 w-5 text-primary-foreground" />
                <span className="text-sm text-primary-foreground">{t('waterSystem')}</span>
              </div>
              {!isShowerStation && (
                <div className="flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-2">
                  <Wind className="h-5 w-5 text-primary-foreground" />
                  <span className="text-sm text-primary-foreground">{t('petDryer')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sanitizing step (TUB only, 30s countdown) */}
        {step === 'sanitizing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center animate-pulse">
              <Droplets className="h-10 w-10 text-primary-foreground" />
            </div>
            <p className="text-xl font-bold text-primary-foreground">🧼 Sanificazione in corso...</p>
            <p className="text-3xl font-bold text-primary-foreground tabular-nums">
              0:{sanitizeSeconds.toString().padStart(2, '0')}
            </p>
            <p className="text-primary-foreground/70 text-sm">Attendere prego</p>
          </div>
        )}

        {/* Rating step */}
        {step === 'rating' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <CheckCircle className="h-16 w-16 text-primary-foreground" />
            <p className="text-xl font-bold text-primary-foreground">{t('sessionFinished')}</p>
            <p className="text-primary-foreground/70 text-sm">Come è andata?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= rating ? 'text-warning fill-warning' : 'text-primary-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cleanup check dialog (TUB only) */}
        {!isShowerStation && (
          <Dialog open={step === 'cleanup'} onOpenChange={() => {}}>
            <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>🧹 Pulizia vasca</DialogTitle>
                <DialogDescription>Hai lasciato la vasca pulita?</DialogDescription>
              </DialogHeader>
              <div className="flex gap-3">
                <Button onClick={() => handleCleanupResponse(true)} className="flex-1" size="lg">
                  ✅ Sì
                </Button>
                <Button onClick={() => handleCleanupResponse(false)} variant="outline" className="flex-1" size="lg">
                  ❌ No
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bottom buttons */}
        {step === 'timer' && (
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
            onClick={handleStopManual}
          >
            ⏹ Stop
          </Button>
        )}

        {step === 'rating' && (
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
            onClick={handleFinish}
          >
            {t('backToHome')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StationTimer;
