import { AppShell } from '@/components/layout/AppShell';
import { StationStatusBadge } from '@/components/station/StationStatusBadge';
import { PriceCard } from '@/components/station/PriceCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { branding } from '@/config/branding';
import { CreditCard, LogIn, Droplets, Wind, Shield, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const stationStatus: 'available' | 'busy' | 'offline' = 'available';

  const handlePayNow = () => {
    navigate('/payment');
  };

  const handleLoginToUseCredits = () => {
    navigate('/login');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Station Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {branding.station.name}
          </h1>
          <p className="text-muted-foreground font-light">
            {branding.clientName}
          </p>
          <StationStatusBadge status={stationStatus} className="inline-flex" />
        </div>

        {/* Station Description */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-sky/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {branding.station.description}
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                Professional dog washing station with water and dryer. Perfect for keeping your furry friend clean and happy!
              </p>
            </div>
          </div>
        </Card>

        {/* Price Card */}
        <PriceCard />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handlePayNow}
            variant="default"
            size="lg"
            className="w-full"
            disabled={stationStatus !== 'available'}
          >
            <CreditCard className="w-5 h-5" />
            Pay Now with Card
          </Button>

          <Button
            onClick={handleLoginToUseCredits}
            variant="sky"
            size="lg"
            className="w-full"
          >
            <LogIn className="w-5 h-5" />
            Login and Use Your Credits
          </Button>
        </div>

        {/* How It Works */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            How it works?
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-bold text-foreground">Pay or use credits</p>
                <p className="text-sm text-muted-foreground font-light">
                  Choose your payment method or login to use your credits
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-bold text-foreground">Wash your dog</p>
                <p className="text-sm text-muted-foreground font-light">
                  Use water and soap to clean your pet thoroughly
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-bold text-foreground">Dry and finish</p>
                <p className="text-sm text-muted-foreground font-light">
                  Use the dryer to leave your dog clean and dry
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Safety Info */}
        <Card className="p-6 bg-sand/10 border-sand">
          <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sand-foreground" />
            Safety recommendations
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground font-light">
            <li>• Always supervise your pet during the wash</li>
            <li>• Check water temperature before starting</li>
            <li>• Keep your dog calm and secured</li>
            <li>• Use the dryer carefully, avoiding eyes and ears</li>
          </ul>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <Droplets className="w-8 h-8 text-sky mx-auto mb-2" />
            <p className="font-bold text-foreground">Water System</p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              Adjustable pressure
            </p>
          </Card>
          <Card className="p-4 text-center">
            <Wind className="w-8 h-8 text-sky mx-auto mb-2" />
            <p className="font-bold text-foreground">Pet Dryer</p>
            <p className="text-xs text-muted-foreground font-light mt-1">
              Safe temperature
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
