import { useParams, useNavigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, CreditCard, Coins, Lock, Timer, AlertTriangle, Crown, DoorOpen, ScanLine, KeyRound, CheckCircle2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QrVerifyScanner } from '@/components/scanner/QrVerifyScanner';

const StationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
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

  // Visibility verification state (for RESTRICTED stations)
  const [visibilityVerified, setVisibilityVerified] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Access gate state
  const [isOpeningGate, setIsOpeningGate] = useState(false);

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
      const { error } = await supabase.from('gate_commands').insert({
        station_id: station.id,
        user_id: user.id,
        command: 'OPEN',
      });
      if (error) throw error;
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
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            mode: 'subscription',
            price_id: plan.stripe_price_id,
            productName: plan.name,
            productType: 'subscription',
            plan_id: plan.id,
            success_url: `${window.location.origin}/subscriptions`,
          },
        });
        if (error) throw error;
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
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: Math.round(pkg.price_eur * 100),
          currency: 'eur',
          productName: `${pkg.name} – ${pkg.credits_value} crediti`,
          productType: 'credit_pack',
          credits: pkg.credits_value,
          structure_id: pkg.structure_id,
          success_url: `${window.location.origin}/s/${station.id}`,
        },
      });
      if (error) throw error;
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
    setIsProcessing(true);
    try {
      if (hasActiveSub) {
        const { data, error } = await supabase.functions.invoke('pay-with-credits', {
          body: { station_id: station.id, option_id: chosen.id, use_subscription: true, subscription_id: activeSub.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(t('serviceActivated'));
        navigate(`/s/${station.id}/timer?option=${chosen.id}`);
      } else if (effectivePaymentMethod === 'credits') {
        const { data, error } = await supabase.functions.invoke('pay-with-credits', {
          body: { station_id: station.id, option_id: chosen.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(t('serviceActivated'));
        navigate(`/s/${station.id}/timer?option=${chosen.id}`);
      } else {
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
          success_url: `${window.location.origin}/s/${station.id}/timer?option=${chosen.id}`,
        };
        const { data, error } = await supabase.functions.invoke('create-checkout', { body });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(t('paymentError'));
    } finally {
      setIsProcessing(false);
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
                className={`p-4 cursor-pointer transition-all ${
                  needsVisibilityVerification ? 'opacity-60' : ''
                } ${
                  selectedOption === opt.id ? 'ring-2 ring-primary shadow-glow-primary' : 'hover:shadow-md'
                }`}
                onClick={() => handleWashOptionClick(opt.id)}
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
    </AppShell>
  );
};

export default StationDetail;
