import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QrVerifyScannerProps {
  expectedStationId: string;
  onVerified: () => void;
  onClose: () => void;
}

export const QrVerifyScanner = ({ expectedStationId, onVerified, onClose }: QrVerifyScannerProps) => {
  const hasScannedRef = useRef(false);
  const onVerifiedRef = useRef(onVerified);
  const onCloseRef = useRef(onClose);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  onVerifiedRef.current = onVerified;
  onCloseRef.current = onClose;

  useEffect(() => {
    let mounted = true;
    let scanner: Html5Qrcode | null = null;
    let stopped = false;

    const initTimeout = setTimeout(() => {
      if (!mounted) return;

      const el = document.getElementById('qr-verify-reader');
      if (!el) {
        setError('Errore di inizializzazione dello scanner.');
        return;
      }

      scanner = new Html5Qrcode('qr-verify-reader');
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            let stationId = decodedText.trim();
            const urlMatch = stationId.match(/\/s\/([^/?#]+)/);
            if (urlMatch) stationId = urlMatch[1];

            if (mounted) setProcessing(true);

            // Stop scanner, then fire callbacks regardless of mount state
            stopped = true;
            scanner?.stop().catch(() => {}).finally(() => {
              // Always fire the callback — even if unmounted, the parent ref handles it
              setTimeout(() => {
                if (stationId.toLowerCase() === expectedStationId.toLowerCase()) {
                  toast.success('QR verificato! Accesso sbloccato.');
                  onVerifiedRef.current();
                } else {
                  toast.error('Il QR code non corrisponde a questa stazione.');
                  onCloseRef.current();
                }
              }, 100);
            });
          },
          () => {}
        )
        .then(() => {
          if (mounted) setScannerReady(true);
        })
        .catch((err) => {
          console.error('[QrVerifyScanner] Start error:', err);
          if (mounted) setError('Impossibile accedere alla fotocamera. Verifica i permessi.');
        });
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      if (scannerRef.current && !stopped) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [expectedStationId]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <p className="text-white text-sm mb-2 font-medium">Scansiona il QR code della stazione</p>
      <p className="text-white/60 text-xs mb-4">Necessario per sbloccare l'accesso riservato</p>

      <div className="w-[300px] h-[300px] relative rounded-2xl overflow-hidden bg-black">
        <div id="qr-verify-reader" className="w-full h-full" />
        {(!scannerReady || processing) && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            {processing && <p className="text-white/80 text-xs">Verifica in corso...</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 text-center px-6">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 text-white border-white/30" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      )}
    </div>
  );
};
