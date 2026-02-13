import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallet';
import { Coins, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Credits = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallets, isLoading } = useWallets();

  const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;

  if (!user) {
    return (
      <AppShell>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6 text-center">
          <h1 className="text-3xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-muted-foreground">Accedi per visualizzare i tuoi crediti</p>
          <Button onClick={() => navigate('/login')}>Accedi</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('myCredits')}</h1>
          <p className="text-muted-foreground font-light">I tuoi saldi per struttura</p>
        </div>

        {/* Total Balance */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-sky/10 border-2 border-sky shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-light uppercase tracking-wide mb-2">
                {t('currentBalance')}
              </p>
              <p className="text-6xl font-bold text-foreground">€{totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Wallets per structure */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Saldi per struttura
          </h2>
          {isLoading ? (
            <Card className="p-4 text-center text-muted-foreground">Caricamento...</Card>
          ) : wallets && wallets.length > 0 ? (
            wallets.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{w.structure_name || 'Struttura'}</p>
                  <span className="text-xl font-bold text-primary">€{w.balance.toFixed(2)}</span>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 text-center space-y-2">
              <p className="text-muted-foreground">Nessun credito disponibile</p>
              <p className="text-sm text-muted-foreground">
                Puoi acquistare crediti dalla pagina di dettaglio di una stazione
              </p>
              <Button variant="outline" onClick={() => navigate('/map')} className="mt-2">
                Trova una stazione
              </Button>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Credits;
