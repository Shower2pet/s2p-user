import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Dog, Droplets, Wind, CheckCircle, Star, AlertTriangle, ShowerHead } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { useStation, isShower } from '@/hooks/useStations';
import { toast } from 'sonner';
import logo from '@/assets/shower2pet-logo.png';

type TubStep = 'rules' | 'timer' | 'cleanup' | 'courtesy' | 'sanitizing' | 'rating';
type ShowerStep = 'timer' | 'rating';
type WashStep = TubStep | ShowerStep;

const SANITIZE_SECONDS = 30;

// Session persistence helpers
const SESSION_KEY = 's2p_active_session';

interface PersistedSession {
  stationId: string;
  optionId: number;
  step: WashStep;
  /** Unix timestamp (ms) when the main timer ends */
  timerEndsAt: number | null;
  /** Unix timestamp (ms) when courtesy timer ends */
  courtesyEndsAt: number | null;
  /** Unix timestamp (ms) when sanitize timer ends */
  sanitizeEndsAt: number | null;
  totalSeconds: number;
}

const saveSession = (session: PersistedSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const loadSession = (stationId: string, optionId: number): PersistedSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: PersistedSession = JSON.parse(raw);
    if (session.stationId === stationId && session.optionId === optionId) return session;
    return null;
  } catch {
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

const StationTimer = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: station } = useStation(id);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const isShowerStation = station ? isShower(station) : false;

  // Find selected option
  const optionId = Number(searchParams.get('option') || 0);
  const option = station?.washing_options?.find(o => o.id === optionId);
  const totalSeconds = option?.duration || 300;

  // Try to restore persisted session
  const restored = useRef(false);
  const getInitialState = useCallback(() => {
    if (!id) return null;
    return loadSession(id, optionId);
  }, [id, optionId]);

  const [step, setStep] = useState<WashStep>('rules');
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [courtesySeconds, setCourtesySeconds] = useState(60);
  const [rating, setRating] = useState(0);
  const [sanitizeSeconds, setSanitizeSeconds] = useState(SANITIZE_SECONDS);

  // Restore session on mount (runs once when station data is available)
  useEffect(() => {
    if (!station || restored.current) return;
    restored.current = true;

    const saved = getInitialState();
    if (saved) {
      const now = Date.now();
      setStep(saved.step);

      if (saved.step === 'timer' && saved.timerEndsAt) {
        const remaining = Math.max(0, Math.round((saved.timerEndsAt - now) / 1000));
        if (remaining > 0) {
          setSecondsLeft(remaining);
          setIsActive(true);
        } else {
          // Timer expired while away
          setSecondsLeft(0);
          setIsActive(false);
          if (isShowerStation) {
            setStep('rating');
          } else {
            setStep('cleanup');
          }
        }
      } else if (saved.step === 'courtesy' && saved.courtesyEndsAt) {
        const remaining = Math.max(0, Math.round((saved.courtesyEndsAt - now) / 1000));
        if (remaining > 0) {
          setCourtesySeconds(remaining);
        } else {
          setStep('cleanup');
        }
      } else if (saved.step === 'sanitizing' && saved.sanitizeEndsAt) {
        const remaining = Math.max(0, Math.round((saved.sanitizeEndsAt - now) / 1000));
        if (remaining > 0) {
          setSanitizeSeconds(remaining);
        } else {
          setStep('rating');
        }
      } else {
        // For non-timer steps (rules, cleanup, rating), just restore the step
      }
      return;
    }

    // No saved session — initialize normally
    if (isShowerStation) {
      setStep('timer');
      setIsActive(true);
    } else {
      setStep('rules');
    }
  }, [station, isShowerStation, getInitialState]);

  // Update total when station loads (only if no restored session)
  useEffect(() => {
    if (option && !loadSession(id || '', optionId)) {
      setSecondsLeft(option.duration);
    }
  }, [option, id, optionId]);

  // Persist session state whenever step or timers change
  useEffect(() => {
    if (!id || step === 'rating') return;
    const now = Date.now();
    const session: PersistedSession = {
      stationId: id,
      optionId,
      step,
      timerEndsAt: step === 'timer' && isActive ? now + secondsLeft * 1000 : null,
      courtesyEndsAt: step === 'courtesy' ? now + courtesySeconds * 1000 : null,
      sanitizeEndsAt: step === 'sanitizing' ? now + sanitizeSeconds * 1000 : null,
      totalSeconds,
    };
    saveSession(session);
  }, [step, secondsLeft, isActive, courtesySeconds, sanitizeSeconds, id, optionId, totalSeconds]);

  // Clear persisted session when reaching rating (session complete)
  useEffect(() => {
    if (step === 'rating') clearSession();
  }, [step]);

  // Main timer
  useEffect(() => {
    if (step !== 'timer' || !isActive || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          if (isShowerStation) {
            setStep('rating'); // Shower: go straight to rating
          } else {
            setStep('cleanup'); // Tub: ask about cleanup
          }
          return 0;
        }
        // 2-minute warning (only for TUB)
        if (!isShowerStation && prev === 121 && !warningShown) {
          toast.warning('⏰ Il tempo sta per scadere! Ricorda di sciacquare la vasca.', { duration: 8000 });
          setWarningShown(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, isActive, secondsLeft, warningShown, isShowerStation]);

  // Courtesy timer (TUB only)
  useEffect(() => {
    if (step !== 'courtesy' || courtesySeconds <= 0) return;

    const interval = setInterval(() => {
      setCourtesySeconds((prev) => {
        if (prev <= 1) {
          setStep('cleanup');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, courtesySeconds]);

  // Sanitizing countdown (TUB only, 30s)
  useEffect(() => {
    if (step !== 'sanitizing') return;
    setSanitizeSeconds(SANITIZE_SECONDS);

    const interval = setInterval(() => {
      setSanitizeSeconds((prev) => {
        if (prev <= 1) {
          setStep('rating');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const handleAcceptRules = () => {
    setStep('timer');
    setIsActive(true);
  };

  const handleStopManual = () => {
    setIsActive(false);
    if (isShowerStation) {
      setStep('rating');
    } else {
      setStep('cleanup');
    }
  };

  const handleCleanupResponse = (clean: boolean) => {
    if (clean) {
      setStep('sanitizing');
    } else {
      setCourtesySeconds(60);
      setStep('courtesy');
    }
  };

  const handleFinish = () => {
    clearSession();
    navigate('/');
  };

  const StationIcon = isShowerStation ? ShowerHead : Dog;

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
