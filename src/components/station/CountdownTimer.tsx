import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

export const CountdownTimer = ({ initialSeconds, onComplete }: CountdownTimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const progress = (seconds / initialSeconds) * 100;

  return (
    <Card className="p-8 bg-gradient-to-br from-primary/5 to-sky/10 border-2 border-primary/20 shadow-lg">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Timer className="w-6 h-6" />
          <span className="text-sm font-bold uppercase tracking-wide">Time Remaining</span>
        </div>
        
        <div className="relative">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className="text-primary transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-foreground tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted-foreground font-light mt-2">
                minutes
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-muted-foreground font-light">
            The station will turn off automatically when the time is over
          </p>
        </div>
      </div>
    </Card>
  );
};
