import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingCart, Loader2 } from 'lucide-react';
import { CreditPackage } from '@/hooks/useCreditPackages';

interface CreditPackagesListProps {
  packages: CreditPackage[];
  purchasingId: string | null;
  onPurchase: (pkg: CreditPackage) => void;
}

export const CreditPackagesList = ({ packages, purchasingId, onPurchase }: CreditPackagesListProps) => {
  if (packages.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        Acquista Crediti
      </h2>
      <p className="text-xs text-muted-foreground">
        I crediti acquistati valgono per tutte le stazioni di questa struttura.
      </p>
      {packages.map((pkg) => {
        const bonus = pkg.credits_value - pkg.price_eur;
        return (
          <Card key={pkg.id} className="p-4 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <h4 className="text-base font-bold text-foreground">{pkg.name}</h4>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary text-sm">{pkg.credits_value} crediti</span>
                  {bonus > 0 && (
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
                      +{bonus.toFixed(0)} bonus
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right space-y-2">
                <p className="text-xl font-bold text-foreground">€{pkg.price_eur.toFixed(0)}</p>
                <Button
                  size="sm"
                  onClick={() => onPurchase(pkg)}
                  disabled={purchasingId === pkg.id}
                >
                  {purchasingId === pkg.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Acquista'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
