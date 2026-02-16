import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { StationIdentityBlock } from '@/components/station/StationIdentityBlock';
import { MapPreview } from '@/components/station/MapPreview';
import { SafetyInfo } from '@/components/station/SafetyInfo';
import { ReportProblemDialog } from '@/components/station/ReportProblemDialog';
import { SubscriptionPlansList } from '@/components/station/SubscriptionPlansList';
import { useStation, isStationOnline, getStationDisplayName } from '@/hooks/useStations';
import { useSubscriptionPlans, useActiveSubscriptionForOwner } from '@/hooks/useSubscriptions';
import { useCreditPackagesForStructure } from '@/hooks/useCreditPackages';
import { CreditPackagesList } from '@/components/station/CreditPackagesList';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWalletForStructure } from '@/hooks/useWallet';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, CreditCard, Coins, Lock, Timer, AlertTriangle, Crown, DoorOpen, ScanLine, KeyRound, CheckCircle2, WifiOff, ShieldAlert } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { QrVerifyScanner } from '@/components/scanner/QrVerifyScanner';
import { sendGateCommand } from '@/services/stationService';
import { createCheckout, payWithCredits, verifySession } from '@/services/paymentService';

const StationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const qrVerified = !!(location.state as any)?.qrVerified;
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: station, isLoading, error } = useStation(id);
  const { data: wallet } = useWalletForStructure(station?.structure_id);
  const { data: plans } = useSubscriptionPlans(station?.structure_owner_id);
  const { data: activeSub } = useActiveSubscriptionForOwner(station?.structure_owner_id);
  const { data: creditPackages } = useCreditPackagesForStructure(station?.structure_id);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'stripe'>('stripe');
  const [showReport, setShowReport] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Hardware activation states
  const [hardwareConnecting, setHardwareConnecting] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  // Visibility verification state — auto-verified if arrived via QR scan
  const [visibilityVerified, setVisibilityVerified] = useState(qrVerified);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Access gate state
  const [isOpeningGate, setIsOpeningGate] = useState(false);

  // Verify payment and refresh wallet after returning from credit purchase
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const creditsUpdated = searchParams.get('credits_updated');
    if (creditsUpdated === '1' && sessionId) {
      // Clean URL immediately
      searchParams.delete('credits_updated');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
      // Verify the specific payment server-side
      verifySession({ session_id: sessionId }).then((data) => {
        if (data?.status === 'completed' || data?.status === 'already_completed') {
          toast.success('Crediti aggiunti al tuo saldo!');
        } else {
          toast.info('Pagamento in attesa di conferma');
        }
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        queryClient.invalidateQueries({ queryKey: ['station', id] });
        queryClient.invalidateQueries({ queryKey: ['stations'] });
      }).catch((error) => {
        console.error('Verify session error:', error);
        toast.error('Errore nella verifica del pagamento');
      });
    }
  }, [searchParams, setSearchParams, queryClient, id]);

  // Auto-sync any pending credit topup transactions on page load
  useEffect(() => {
    if (!user) return;
    verifySession({ process_all_pending: true }).then((data) => {
      if (data?.credits_added > 0) {
        toast.success(`${data.credits_added} crediti sincronizzati!`);
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
      }
    }).catch(() => {});
  }, [user, queryClient]);

  const handleQrVerified = useCallback(() => {
    setVisibilityVerified(true);
    setShowQrScanner(false);
    toast.success('Accesso verificato! Ora puoi attivare i servizi.');
  }, []);

  const handleManualCodeVerify = () => {
    if (!station || !manualCode.trim()) return;
    const code = manualCode.trim().toLowerCase();
    if (code === station.id.toLowerCase()) {
      setVisibilityVerified(true);
      setManualCode('');
      toast.success('Codice verificato! Ora puoi attivare i servizi.');
    } else {
      toast.error('Codice non valido. Riprova.');
    }
  };

  const handleOpenGate = async () => {
    if (!user) {
      toast.error('Devi effettuare il login per aprire la porta');
      navigate('/login');
      return;
    }
    if (!station) return;
    setIsOpeningGate(true);
    try {
      await sendGateCommand(station.id, user.id, 'OPEN');
      toast.success('Comando di apertura inviato!');
    } catch (err) {
      console.error('Gate open error:', err);
      toast.error('Errore nell\'invio del comando');
    } finally {
      setIsOpeningGate(false);
    }
  };

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

  const online = isStationOnline(station);
  const displayStatus = online ? 'available' : station.status === 'MAINTENANCE' ? 'offline' : station.status === 'BUSY' ? 'busy' : 'offline';
  const washOptions = station.washing_options || [];
  const chosen = washOptions.find(o => o.id === selectedOption);
  const walletBalance = wallet?.balance || 0;
  const isRestricted = station.visibility === 'RESTRICTED';
  const hasActiveSub = !!activeSub;
  const needsVisibilityVerification = isRestricted && !visibilityVerified;

  const canPayWithCredits = user && walletBalance >= (chosen?.price || 0) && (chosen?.price || 0) > 0;
  const effectivePaymentMethod = hasActiveSub ? 'subscription' as const : paymentMethod === 'credits' && canPayWithCredits ? 'credits' : 'stripe';

  const handleWashOptionClick = (optId: number) => {
    if (needsVisibilityVerification) {
      toast.error('Devi verificare il tuo accesso prima di attivare un servizio.');
      return;
    }
    setSelectedOption(optId);
    setShowCheckout(true);
  };

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast.error('Devi effettuare il login per abbonarti');
      navigate('/login');
      return;
    }
    
    if (plan.stripe_price_id) {
      setIsProcessing(true);
      try {
        const data = await createCheckout({
          mode: 'subscription',
          price_id: plan.stripe_price_id,
          productName: plan.name,
          productType: 'subscription',
          plan_id: plan.id,
          success_url: `${window.location.origin}/subscriptions`,
        });
        if (data?.url) window.location.href = data.url;
      } catch (err: any) {
        console.error('Subscription error:', err);
        toast.error('Errore nella creazione dell\'abbonamento');
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.info('Abbonamento non ancora configurato. Contatta la struttura.');
    }
  };

  const handlePurchaseCredits = async (pkg: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPurchasingId(pkg.id);
    try {
      const data = await createCheckout({
        amount: Math.round(pkg.price_eur * 100),
        currency: 'eur',
        productName: `${pkg.name} – ${pkg.credits_value} crediti`,
        productType: 'credit_pack',
        credits: pkg.credits_value,
        structure_id: pkg.structure_id || station.structure_id,
        success_url: `${window.location.origin}/s/${station.id}?credits_updated=1&session_id={CHECKOUT_SESSION_ID}`,
        mode: 'payment',
      });
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('Errore durante l\'acquisto');
    } finally {
      setPurchasingId(null);
    }
  };

  const handlePay = async () => {
    if (!chosen) return;

    // For credits or subscription: deduct and go to timer
    if (hasActiveSub || effectivePaymentMethod === 'credits') {
      setIsProcessing(true);
      setShowCheckout(false);

      try {
        const body: any = { station_id: station.id, option_id: chosen.id };
        if (hasActiveSub) {
          body.use_subscription = true;
          body.subscription_id = activeSub.id;
        }

        await payWithCredits(body);

        // Payment success — go to timer page where hardware is activated
        toast.success("Pagamento confermato! Vai alla stazione per avviare il servizio.");
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        navigate(`/s/${station.id}/timer`);
      } catch (err: any) {
        console.error('Payment error:', err);
        toast.error(err.message || t('paymentError'));
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Stripe card flow — redirect to checkout (hardware handled on webhook/timer page)
      setIsProcessing(true);
      try {
        const body: any = {
          station_id: station.id,
          option_id: chosen.id,
          amount: Math.round(chosen.price * 100),
          productName: chosen.name,
          currency: 'eur',
          mode: 'payment',
          productType: 'session',
          user_id: user?.id || null,
          guest_email: !user ? guestEmail : null,
          success_url: `${window.location.origin}/s/${station.id}/timer?session_id={CHECKOUT_SESSION_ID}`,
        };
        const data = await createCheckout(body);
        if (data?.url) window.location.href = data.url;
      } catch (err: any) {
        console.error('Payment error:', err);
        toast.error(t('paymentError'));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Station Identity */}
        <div className="animate-fade-in">
          <StationIdentityBlock
            name={getStationDisplayName(station)}
            status={displayStatus as 'available' | 'busy' | 'offline'}
            description={station.structure_description || undefined}
          />
        </div>

        {/* Map Preview */}
        <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <MapPreview
            stationName={getStationDisplayName(station)}
            address={station.structure_address || undefined}
            lat={station.geo_lat || station.structure_geo_lat || undefined}
            lng={station.geo_lng || station.structure_geo_lng || undefined}
          />
        </div>

        {/* Access Gate Button */}
        {station.has_access_gate && (
          <Card className="p-4 space-y-2 animate-fade-in border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-bold text-foreground text-sm">Accesso Struttura</p>
                  <p className="text-xs text-muted-foreground">Apri la porta per accedere alla stazione</p>
                </div>
              </div>
              <Button
                onClick={handleOpenGate}
                disabled={isOpeningGate}
                size="sm"
              >
                {isOpeningGate ? <Loader2 className="w-4 h-4 animate-spin" /> : <DoorOpen className="w-4 h-4" />}
                {isOpeningGate ? 'Invio...' : 'Apri Porta'}
              </Button>
            </div>
          </Card>
        )}

        {/* Restricted visibility verification */}
        {isRestricted && (
          <Card className="p-4 space-y-3 animate-fade-in border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 text-warning">
              <Lock className="w-5 h-5" />
              <span className="font-bold text-sm">Accesso Riservato ai Clienti</span>
            </div>
            {visibilityVerified ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Accesso verificato</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Per attivare un servizio, scansiona il QR code della stazione o inserisci il codice manualmente.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowQrScanner(true)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ScanLine className="w-4 h-4" />
                    Scansiona QR
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Inserisci codice stazione"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualCodeVerify()}
                  />
                  <Button onClick={handleManualCodeVerify} size="sm" variant="secondary">
                    <KeyRound className="w-4 h-4" />
                    Verifica
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Active subscription banner */}
        {hasActiveSub && (
          <Card className="p-4 border-accent/30 bg-accent/5 animate-fade-in">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" />
              <div>
                <p className="font-bold text-foreground text-sm">Abbonamento Attivo</p>
                <p className="text-xs text-muted-foreground">Puoi avviare il lavaggio con il tuo abbonamento</p>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Plans (only if no active subscription) */}
        {!hasActiveSub && plans && plans.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '0.08s' }}>
            <SubscriptionPlansList
              plans={plans}
              activePlanId={activeSub?.plan_id}
              onSubscribe={handleSubscribe}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Credit Packages */}
        {creditPackages && creditPackages.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '0.09s' }}>
            <CreditPackagesList
              packages={creditPackages}
              purchasingId={purchasingId}
              onPurchase={handlePurchaseCredits}
            />
          </div>
        )}

        {/* Offline banner */}
        {!online && (
          <Card className="p-4 border-destructive/30 bg-destructive/5 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-bold text-foreground text-sm">Stazione non disponibile</p>
                <p className="text-xs text-muted-foreground">
                  {station.status === 'BUSY' ? 'La stazione è attualmente in uso. Riprova tra poco.' : 
                   station.status === 'MAINTENANCE' ? 'La stazione è in manutenzione.' :
                   'La stazione è attualmente offline.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Washing Options */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg font-bold text-foreground">{t('washingOptions') || 'Opzioni Lavaggio'}</h2>
          {washOptions.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground text-sm">
              Nessuna opzione disponibile
            </Card>
          ) : (
            washOptions.map((opt) => (
              <Card
                key={opt.id}
                className={`p-4 transition-all ${
                  !online ? 'opacity-50 cursor-not-allowed' :
                  needsVisibilityVerification ? 'opacity-60 cursor-pointer' : 'cursor-pointer'
                } ${
                  selectedOption === opt.id && online ? 'ring-2 ring-primary shadow-glow-primary' : online ? 'hover:shadow-md' : ''
                }`}
                onClick={() => online && handleWashOptionClick(opt.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      {hasActiveSub ? <Crown className="w-5 h-5 text-accent" /> : <Coins className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{opt.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Timer className="w-3 h-3" />
                        <span>{Math.floor(opt.duration / 60)} {t('minutes')}</span>
                      </div>
                    </div>
                  </div>
                  {hasActiveSub ? (
                    <span className="text-sm font-bold text-accent">Incluso</span>
                  ) : (
                    <span className="text-xl font-bold text-primary">€{opt.price.toFixed(2)}</span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Report Problem Button */}
        <Button
          onClick={() => setShowReport(true)}
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
        >
          <AlertTriangle className="w-4 h-4" />
          Segnala un problema
        </Button>

        {/* Safety Info */}
        <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <SafetyInfo />
        </div>
      </div>

      {/* Report Problem Dialog */}
      <ReportProblemDialog
        open={showReport}
        onOpenChange={setShowReport}
        stationId={station.id}
      />

      {/* Checkout Modal */}
      <Dialog open={showCheckout && !!chosen} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{hasActiveSub ? 'Avvia con Abbonamento' : t('payment')}</DialogTitle>
            <DialogDescription>
              {chosen?.name} – {chosen ? Math.floor(chosen.duration / 60) : 0} {t('minutes')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {hasActiveSub ? (
              <Card className="p-4 space-y-2 bg-accent/5 border-accent/20">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-accent" />
                  <span className="font-bold text-foreground">Incluso nel tuo abbonamento</span>
                </div>
                <p className="text-xs text-muted-foreground">Il lavaggio verrà conteggiato nel tuo piano attuale</p>
              </Card>
            ) : (
              <>
                {!user && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email *</label>
                    <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="email@esempio.com" required />
                    <p className="text-xs text-muted-foreground">Necessaria per la ricevuta</p>
                  </div>
                )}

                {user && walletBalance > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Metodo di pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setPaymentMethod('credits')}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                          paymentMethod === 'credits' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                        } ${!canPayWithCredits ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        disabled={!canPayWithCredits}>
                        <Coins className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-foreground">Crediti</p>
                          <p className="text-xs text-muted-foreground">€{walletBalance.toFixed(2)} disp.</p>
                        </div>
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('stripe')}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                          paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                        }`}>
                        <CreditCard className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-foreground">Carta</p>
                          <p className="text-xs text-muted-foreground">Visa, MC, ...</p>
                        </div>
                      </button>
                    </div>
                    {!canPayWithCredits && walletBalance > 0 && (
                      <p className="text-xs text-warning">Crediti insufficienti</p>
                    )}
                  </div>
                )}

                <Card className="p-4 space-y-2 bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('price')}</span>
                    <span className="font-bold">€{chosen?.price.toFixed(2)}</span>
                  </div>
                  {effectivePaymentMethod === 'credits' && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Pagato con crediti</span>
                      <span>- €{chosen?.price.toFixed(2)}</span>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={handlePay}
              disabled={isProcessing || (!user && !guestEmail && !hasActiveSub) || displayStatus !== 'available'}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : hasActiveSub ? (
                <Crown className="w-5 h-5" />
              ) : effectivePaymentMethod === 'credits' ? (
                <Coins className="w-5 h-5" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {isProcessing
                ? t('processing')
                : hasActiveSub
                  ? 'Avvia con Abbonamento'
                  : effectivePaymentMethod === 'credits'
                    ? `${t('activateNow')} (crediti)`
                    : `${t('payNowWithCard')} €${chosen?.price.toFixed(2)}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scanner for restricted visibility verification */}
      {showQrScanner && (
        <QrVerifyScanner
          expectedStationId={station.id}
          onVerified={handleQrVerified}
          onClose={() => setShowQrScanner(false)}
        />
      )}

      {/* Hardware Connecting Overlay — blocks all interaction */}
      {hardwareConnecting && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-pulse">
              <WifiOff className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center space-y-2 px-6">
            <h2 className="text-xl font-bold text-foreground">Connessione alla stazione in corso...</h2>
            <p className="text-sm text-muted-foreground">Stiamo attivando la stazione. Non chiudere questa pagina.</p>
          </div>
        </div>
      )}

      {/* Refund Dialog — shown when hardware fails */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <DialogTitle className="text-left">Stazione non raggiungibile</DialogTitle>
            </div>
            <DialogDescription className="text-left">
              Ci scusiamo, la stazione sembra non rispondere. I tuoi crediti sono stati rimborsati istantaneamente e il gestore è stato avvisato del problema.
            </DialogDescription>
          </DialogHeader>
          <Card className="p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm font-bold text-foreground">Crediti rimborsati con successo</span>
            </div>
          </Card>
          <DialogFooter>
            <Button onClick={() => { setShowRefundDialog(false); navigate('/'); }} className="w-full" size="lg">
              Torna alla Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default StationDetail;
