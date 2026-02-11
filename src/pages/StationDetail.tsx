import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { StationIdentityBlock } from '@/components/station/StationIdentityBlock';
import { MapPreview } from '@/components/station/MapPreview';
import { SafetyInfo } from '@/components/station/SafetyInfo';
import { AboutStation } from '@/components/station/AboutStation';
import { useStation, isStationOnline, getStationDisplayName } from '@/hooks/useStations';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWalletForStructure } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, CreditCard, Coins, Lock, Timer } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const StationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: station, isLoading, error } = useStation(id);
  const { data: wallet } = useWalletForStructure(station?.structure_id);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'stripe'>('stripe');

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

  const canPayWithCredits = user && walletBalance >= (chosen?.price || 0) && (chosen?.price || 0) > 0;

  // Auto-select credits if user has enough balance
  const effectivePaymentMethod = paymentMethod === 'credits' && canPayWithCredits ? 'credits' : 'stripe';

  const handlePay = async () => {
    if (!chosen) return;
    setIsProcessing(true);
    try {
      if (effectivePaymentMethod === 'credits') {
        // Pay with wallet credits
        const { data, error } = await supabase.functions.invoke('pay-with-credits', {
          body: { station_id: station.id, option_id: chosen.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(t('serviceActivated'));
        navigate(`/s/${station.id}/timer?option=${chosen.id}`);
      } else {
        // Pay with Stripe
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

        if (data?.url) {
          window.location.href = data.url;
        }
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
            stationType={station.type}
            category={station.category}
          />
          {station.visibility === 'RESTRICTED' && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-warning/10 text-warning text-sm">
              <Lock className="w-4 h-4" />
              <span>Solo Clienti della struttura</span>
            </div>
          )}
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
                  selectedOption === opt.id ? 'ring-2 ring-primary shadow-glow-primary' : 'hover:shadow-md'
                }`}
                onClick={() => {
                  setSelectedOption(opt.id);
                  setShowCheckout(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{opt.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Timer className="w-3 h-3" />
                        <span>{Math.floor(opt.duration / 60)} {t('minutes')}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-primary">€{opt.price.toFixed(2)}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Safety Info */}
        <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <SafetyInfo />
        </div>

        {/* About Station */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <AboutStation
            location={station.structure_name || ''}
            address={station.structure_address || ''}
            lat={station.geo_lat || station.structure_geo_lat || undefined}
            lng={station.geo_lng || station.structure_geo_lng || undefined}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={showCheckout && !!chosen} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('payment')}</DialogTitle>
            <DialogDescription>
              {chosen?.name} – {chosen ? Math.floor(chosen.duration / 60) : 0} {t('minutes')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Guest email */}
            {!user && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email *</label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="email@esempio.com"
                  required
                />
                <p className="text-xs text-muted-foreground">Necessaria per la ricevuta</p>
              </div>
            )}

            {/* Payment method selection */}
            {user && walletBalance > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Metodo di pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credits')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'credits'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    } ${!canPayWithCredits ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={!canPayWithCredits}
                  >
                    <Coins className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Crediti</p>
                      <p className="text-xs text-muted-foreground">€{walletBalance.toFixed(2)} disp.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${
                      paymentMethod === 'stripe'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Carta</p>
                      <p className="text-xs text-muted-foreground">Visa, MC, ...</p>
                    </div>
                  </button>
                </div>
                {!canPayWithCredits && walletBalance > 0 && (
                  <p className="text-xs text-warning">Crediti insufficienti (€{walletBalance.toFixed(2)} / €{chosen?.price.toFixed(2)})</p>
                )}
              </div>
            )}

            {/* Price breakdown */}
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
          </div>

          <DialogFooter>
            <Button
              onClick={handlePay}
              disabled={isProcessing || (!user && !guestEmail) || displayStatus !== 'available'}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : effectivePaymentMethod === 'credits' ? (
                <Coins className="w-5 h-5" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {isProcessing
                ? t('processing')
                : effectivePaymentMethod === 'credits'
                  ? `${t('activateNow')} (crediti)`
                  : `${t('payNowWithCard')} €${chosen?.price.toFixed(2)}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default StationDetail;
