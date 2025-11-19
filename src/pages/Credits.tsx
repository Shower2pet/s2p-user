import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CreditPackCard } from '@/components/credits/CreditPackCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { branding } from '@/config/branding';
import { Coins, Plus, TrendingUp, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Credits = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(12);

  const handlePurchase = (pack: typeof branding.creditPacks[0]) => {
    // Mock purchase
    setCredits(prev => prev + pack.credits);
    toast.success(`Successfully purchased ${pack.credits} credits!`);
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Credits</h1>
          <p className="text-muted-foreground font-light">
            Manage your credits and top up your balance
          </p>
        </div>

        {/* Current Balance */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-sky/10 border-2 border-sky shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-light uppercase tracking-wide mb-2">
                Current Balance
              </p>
              <p className="text-6xl font-bold text-foreground">
                {credits}
              </p>
              <p className="text-sm text-muted-foreground font-light mt-2">
                credits available
              </p>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-mint/10 border-mint">
          <p className="text-sm text-center text-foreground font-light">
            💡 1 credit = {branding.station.currency}{branding.creditValue.toFixed(2)} = 1 wash session
          </p>
        </Card>

        {/* Top Up Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Top Up Credits
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {branding.creditPacks.map((pack) => (
              <CreditPackCard
                key={pack.id}
                pack={pack}
                onPurchase={() => handlePurchase(pack)}
              />
            ))}
          </div>
        </div>

        {/* Subscription Link */}
        <Card className="p-6 bg-gradient-to-r from-sand/10 to-accent/10 border-sand">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                Want to save more?
              </h3>
              <p className="text-sm text-muted-foreground font-light">
                Subscribe and get up to 20% more credits
              </p>
            </div>
            <Button
              onClick={() => navigate('/subscriptions')}
              variant="accent"
              size="lg"
            >
              <TrendingUp className="w-5 h-5" />
              View Plans
            </Button>
          </div>
        </Card>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
          <div className="space-y-2">
            {[
              { date: 'Today, 14:30', type: 'Used', amount: -1, description: 'Session at Doccia Bracco' },
              { date: 'Yesterday', type: 'Top-up', amount: +12, description: 'Purchased Starter Pack' },
              { date: '3 days ago', type: 'Used', amount: -1, description: 'Session at Doccia Bracco' },
            ].map((transaction, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground font-light">{transaction.date}</p>
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    transaction.amount > 0 ? "text-success" : "text-foreground"
                  )}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Credits;
