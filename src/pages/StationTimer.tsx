import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Dog, Droplets, Wind, CheckCircle, Star, AlertTriangle, ShowerHead, Loader2, Play, StopCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { useStation, isShower, getStationDisplayName } from '@/hooks/useStations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/shower2pet-logo.png';

type WashStep = 'ready' | 'rules' | 'timer' | 'cleanup' | 'courtesy' | 'sanitizing' | 'rating';

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
  const stripeSessionId = searchParams.get('session_id');
  const { data: station } = useStation(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const isShowerStation = station ? isShower(station) : false;

  const [session, setSession] = useState<WashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WashStep>('ready');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [courtesySeconds, setCourtesySeconds] = useState(60);
  const [rating, setRating] = useState(0);
  const [sanitizeSeconds, setSanitizeSeconds] = useState(SANITIZE_SECONDS);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // CRITICAL: Deterministic OFF scheduler — completely decoupled from React state
  // Uses setTimeout + refs so it survives re-renders and effect re-runs
  // ══════════════════════════════════════════════════════════════
  const offTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offSentRef = useRef(false);
  // Store session data in a ref so the timeout callback always has fresh data
  const sessionRef = useRef<WashSession | null>(null);

  // Keep sessionRef in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Send OFF command to hardware (idempotent via offSentRef)
  const sendOff = useCallback(async (stationId: string) => {
    if (offSentRef.current) {
      console.log('[RELAY] OFF already sent, skipping');
      return;
    }
    offSentRef.current = true;
    console.log('[RELAY] >>> Sending OFF command for station:', stationId);
    try {
      const { data, error } = await supabase.functions.invoke('station-control', {
        body: { station_id: stationId, command: 'OFF' },
      });
      console.log('[RELAY] OFF result:', JSON.stringify({ data, error: error?.message }));
    } catch (e) {
      console.error('[RELAY] OFF failed:', e);
      // Reset so cron can retry or user can retry
      offSentRef.current = false;
    }
  }, []);

  // Mark session completed in DB
  const markCompleted = useCallback(async (sessionId: string) => {
    console.log('[RELAY] Marking session COMPLETED:', sessionId);
    const { error } = await supabase
      .from('wash_sessions')
      .update({ status: 'COMPLETED', step: 'rating' })
      .eq('id', sessionId)
      .eq('status', 'ACTIVE');
    if (error) console.error('[RELAY] DB update error:', error.message);
    else console.log('[RELAY] Session marked COMPLETED OK');
  }, []);

  // Schedule the OFF command at a specific absolute time
  const scheduleOff = useCallback((stationId: string, sessionId: string, endsAtMs: number) => {
    // Clear any existing timer
    if (offTimeoutRef.current) {
      clearTimeout(offTimeoutRef.current);
      offTimeoutRef.current = null;
    }

    const delayMs = Math.max(0, endsAtMs - Date.now());
    console.log('[RELAY] Scheduling OFF in', Math.round(delayMs / 1000), 'seconds for station:', stationId);

    if (delayMs <= 0) {
      // Already expired — send OFF immediately
      console.log('[RELAY] Timer already expired, sending OFF NOW');
      sendOff(stationId);
      markCompleted(sessionId);
      setIsActive(false);
      setSecondsLeft(0);
      setStep('rating');
      return;
    }

    offTimeoutRef.current = setTimeout(async () => {
      console.log('[RELAY] ⏰ Timer expired! Executing OFF sequence');
      await sendOff(stationId);
      await markCompleted(sessionId);
      setIsActive(false);
      setSecondsLeft(0);
      setStep('rating');
    }, delayMs);
  }, [sendOff, markCompleted]);

  // Cancel scheduled OFF (e.g., manual stop)
  const cancelScheduledOff = useCallback(() => {
    if (offTimeoutRef.current) {
      clearTimeout(offTimeoutRef.current);
      offTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (offTimeoutRef.current) clearTimeout(offTimeoutRef.current);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════
  // Fetch active session from DB
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!id) return;
    if (!user && !stripeSessionId) return;

    let retries = 0;
    const maxRetries = 10;
    let cancelled = false;

    const fetchSession = async () => {
      let query = supabase
        .from('wash_sessions')
        .select('*')
        .eq('station_id', id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1);

      if (stripeSessionId) {
        query = supabase
          .from('wash_sessions')
          .select('*')
          .eq('station_id', id)
          .eq('stripe_session_id', stripeSessionId)
          .order('created_at', { ascending: false })
          .limit(1);
      } else if (user) {
        query = query.eq('user_id', user.id);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        if (cancelled) return;
        const ws = data as WashSession;
        setSession(ws);
        const currentStep = ws.step as WashStep;
        setStep(currentStep);

        if (currentStep === 'timer' || currentStep === 'courtesy') {
          const endsAt = new Date(ws.ends_at).getTime();
          const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));

          if (remaining > 0) {
            if (currentStep === 'courtesy') {
              setCourtesySeconds(remaining);
            } else {
              setSecondsLeft(remaining);
              setIsActive(true);
              // CRITICAL: Schedule the OFF command for this session
              if (isShowerStation) {
                scheduleOff(ws.station_id, ws.id, endsAt);
              }
            }
          } else {
            // Timer already expired
            setSecondsLeft(0);
            setIsActive(false);
            if (currentStep === 'courtesy') {
              updateSessionStep(ws.id, 'cleanup');
              setStep('cleanup');
            } else if (isShowerStation) {
              // Expired shower session — send OFF now
              setStep('rating');
              sendOff(ws.station_id);
              markCompleted(ws.id);
            } else {
              updateSessionStep(ws.id, 'cleanup');
              setStep('cleanup');
            }
          }
        }
        setLoading(false);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(() => { if (!cancelled) fetchSession(); }, 1500);
      } else {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSession();
    return () => { cancelled = true; };
  }, [id, user, stripeSessionId, isShowerStation]);

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
            cancelScheduledOff(); // No need to send OFF, already handled
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, cancelScheduledOff]);

  const updateSessionStep = async (sessionId: string, newStep: string, status?: string) => {
    const updates: any = { step: newStep };
    if (status) updates.status = status;
    await supabase.from('wash_sessions').update(updates).eq('id', sessionId);
  };

  // Handle "Avvia Servizio" — activate hardware + recalculate ends_at from NOW
  const handleStartService = async () => {
    if (!session) return;
    setStarting(true);

    try {
      const durationMinutes = Math.ceil(session.total_seconds / 60);
      const { data: hwData, error: hwError } = await supabase.functions.invoke('station-control', {
        body: {
          station_id: session.station_id,
          command: 'START_TIMED_WASH',
          duration_minutes: durationMinutes,
          session_id: session.id,
        },
      });

      if (hwError || !hwData?.success) {
        toast.error('La stazione non risponde. Riprova o contatta il supporto.');
        setStarting(false);
        return;
      }

      // Hardware OK — update session timing
      const now = new Date();
      const endsAt = new Date(now.getTime() + session.total_seconds * 1000);

      const { error } = await supabase
        .from('wash_sessions')
        .update({
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          step: isShowerStation ? 'timer' : 'rules',
        })
        .eq('id', session.id);

      if (error) {
        toast.error('Errore nell\'avvio del servizio');
        setStarting(false);
        return;
      }

      toast.success("🚿 Stazione attivata! L'acqua è in erogazione.");
      const updatedSession = { ...session, started_at: now.toISOString(), ends_at: endsAt.toISOString() };
      setSession(updatedSession);
      setSecondsLeft(session.total_seconds);

      if (isShowerStation) {
        setStep('timer');
        setIsActive(true);
        // CRITICAL: Schedule the deterministic OFF
        offSentRef.current = false; // Reset for new session start
        scheduleOff(session.station_id, session.id, endsAt.getTime());
      } else {
        setStep('rules');
      }
    } catch (err) {
      console.error('Hardware activation error:', err);
      toast.error('Errore di connessione alla stazione');
    } finally {
      setStarting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Visual countdown — DISPLAY ONLY, does NOT trigger OFF
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (step !== 'timer' || !isActive || !session?.ends_at) return;

    const endsAt = new Date(session.ends_at).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      // Warning for TUB stations
      if (!isShowerStation && remaining === 120 && !warningShown) {
        toast.warning('⏰ Il tempo sta per scadere! Ricorda di sciacquare la vasca.', { duration: 8000 });
        setWarningShown(true);
      }

      // When visual countdown hits 0, just update display
      // The actual OFF command is handled by the scheduled setTimeout
      if (remaining <= 0) {
        setIsActive(false);
        if (!isShowerStation) {
          setStep('cleanup');
          updateSessionStep(session.id, 'cleanup');
        }
        // For shower: the scheduleOff timeout handles everything
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, isActive, session?.ends_at, warningShown, isShowerStation]);

  // Courtesy timer (TUB only)
  useEffect(() => {
    if (step !== 'courtesy' || !session) return;

    const tick = () => {
      const now = Date.now();
      const endsAt = new Date(session.ends_at).getTime();
      const remaining = Math.max(0, Math.round((endsAt - now) / 1000));
      setCourtesySeconds(remaining);

      if (remaining <= 0) {
        setStep('rating');
        updateSessionStep(session.id, 'rating', 'COMPLETED');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, session?.ends_at]);

  // Sanitizing countdown (TUB only)
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

  const handleStopManual = async () => {
    if (!session) return;
    setStopping(true);

    // Cancel the scheduled OFF timeout
    cancelScheduledOff();

    try {
      const { data, error } = await supabase.functions.invoke('station-control', {
        body: { station_id: session.station_id, command: 'OFF' },
      });
      if (error || !data?.success) {
        toast.error('Errore nello spegnimento. Riprova.');
        setStopping(false);
        return;
      }
      offSentRef.current = true; // Mark as sent
    } catch (_) {
      toast.error('Errore di connessione');
      setStopping(false);
      return;
    }

    setIsActive(false);
    setSecondsLeft(0);
    setStopping(false);
    setShowStopConfirm(false);

    if (isShowerStation) {
      setStep('rating');
      updateSessionStep(session.id, 'rating', 'COMPLETED');
    } else {
      setStep('cleanup');
      updateSessionStep(session.id, 'cleanup');
    }
    toast.success('Lavaggio terminato.');
  };

  const handleCleanupResponse = async (clean: boolean) => {
    if (clean) {
      setStep('rating');
      if (session) updateSessionStep(session.id, 'rating', 'COMPLETED');
    } else {
      const courtesyDuration = 60;
      setCourtesySeconds(courtesyDuration);
      setStep('courtesy');
      if (session) {
        const courtesyEndsAt = new Date(Date.now() + courtesyDuration * 1000).toISOString();
        await supabase.from('wash_sessions').update({ step: 'courtesy', ends_at: courtesyEndsAt }).eq('id', session.id);
        setSession({ ...session, ends_at: courtesyEndsAt });
      }
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
              {getStationDisplayName(station)}
            </p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-foreground/20 text-primary-foreground">
              {station.type} — {isShowerStation ? '🚿 Doccia' : '🛁 Vasca'}
            </span>
          </div>
        )}

        {/* STEP: Ready — waiting for user to start */}
        {step === 'ready' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <StationIcon className="h-12 w-12 text-primary-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold text-primary-foreground">Pagamento confermato ✓</p>
              <p className="text-primary-foreground/80 text-base">
                {session.option_name} — {Math.floor(session.total_seconds / 60)} minuti
              </p>
            </div>
            <Button
              onClick={handleStartService}
              disabled={starting}
              size="lg"
              className="w-full max-w-xs h-16 text-lg rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0 shadow-glow-primary"
            >
              {starting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Play className="w-6 h-6" />
              )}
              {starting ? 'Avvio in corso...' : 'Avvia Servizio'}
            </Button>
            <p className="text-primary-foreground/60 text-xs text-center">
              Il timer partirà quando premi il pulsante
            </p>
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

        {/* Sanitizing step (TUB only) */}
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
          <>
            <Button
              variant="destructive"
              size="lg"
              className="w-full h-14 text-base rounded-full"
              onClick={() => setShowStopConfirm(true)}
              disabled={stopping}
            >
              {stopping ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <StopCircle className="w-5 h-5 mr-2" />}
              Termina Lavaggio
            </Button>

            <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
              <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ Terminare il lavaggio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Il lavaggio verrà interrotto immediatamente. Non è previsto alcun rimborso per l'interruzione anticipata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleStopManual}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Conferma e Termina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
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
