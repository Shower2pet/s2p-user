import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CountdownTimer } from '@/components/station/CountdownTimer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { branding } from '@/config/branding';
import { Power, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ActiveSession = () => {
  const navigate = useNavigate();
  const [sessionComplete, setSessionComplete] = useState(false);
  const initialSeconds = branding.station.durationMinutes * 60;

  const handleSessionComplete = () => {
    setSessionComplete(true);
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {branding.station.name}
          </h1>
          <Badge className="bg-success text-foreground">
            <Power className="w-4 h-4" />
            Service Active
          </Badge>
        </div>

        {!sessionComplete ? (
          <>
            <CountdownTimer
              initialSeconds={initialSeconds}
              onComplete={handleSessionComplete}
            />

            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <p className="text-foreground font-light">
                  The dog wash station is currently ON and running
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-center text-muted-foreground font-light">
                💡 The station will turn off automatically when the time is over
              </p>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-mint/10 to-success/10 border-success">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Power className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Session Finished
              </h2>
              <p className="text-muted-foreground font-light">
                Thank you for using {branding.station.name}!
              </p>
            </Card>

            <Button
              onClick={() => navigate('/')}
              variant="default"
              size="lg"
              className="w-full"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Button>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default ActiveSession;
