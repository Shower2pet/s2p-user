import { Component, ErrorInfo, ReactNode } from 'react';
import { logErrorToDb, GENERIC_ERROR_MESSAGE } from '@/services/errorLogService';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logErrorToDb({
      error_message: error.message,
      error_stack: error.stack,
      error_context: `ErrorBoundary — ${errorInfo.componentStack?.slice(0, 500)}`,
      component: 'ErrorBoundary',
      severity: 'critical',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{GENERIC_ERROR_MESSAGE}</h2>
            <p className="text-sm text-muted-foreground">
              Il nostro team è stato avvisato. Prova a ricaricare la pagina.
            </p>
            <Button onClick={() => window.location.reload()}>
              Ricarica pagina
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
