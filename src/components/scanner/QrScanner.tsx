import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface QrScannerProps {
  onClose: () => void;
}

export const QrScanner = ({ onClose }: QrScannerProps) => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const navigateRef = useRef(navigate);
  const [error, setError] = useState<string | null>(null);

  // Keep refs updated
  onCloseRef.current = onClose;
  navigateRef.current = navigate;

  useEffect(() => {
    isMountedRef.current = true;
    const scannerId = 'qr-reader';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Prevent double scan
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          let stationId = decodedText.trim();
          const urlMatch = stationId.match(/\/s\/([^/?#]+)/);
          if (urlMatch) {
            stationId = urlMatch[1];
          }

          console.log('[QrScanner] Scanned station:', stationId);

          // Stop scanner safely
          stopped = true;
          scanner.stop().catch(() => {}).finally(() => {
            console.log('[QrScanner] Scanner stopped, navigating to:', `/s/${stationId}`);
            toast.success('QR code letto!');
            // Navigate first, then close overlay
            navigateRef.current(`/s/${stationId}`);
            // Close the overlay after navigation is triggered
            setTimeout(() => {
              if (isMountedRef.current) {
                onCloseRef.current();
              }
            }, 50);
          });
        },
        () => {}
      )
      .catch((err) => {
        console.error('[QrScanner] Start error:', err);
        if (isMountedRef.current) {
          setError('Impossibile accedere alla fotocamera. Verifica i permessi.');
        }
      });

    return () => {
      isMountedRef.current = false;
      if (!stopped) {
        scanner.stop().catch(() => {});
      }
    };
  }, []); // No dependencies - refs handle everything

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <p className="text-white text-sm mb-4 font-medium">Inquadra il QR code della stazione</p>

      <div className="w-[300px] h-[300px] relative rounded-2xl overflow-hidden">
        <div id="qr-reader" className="w-full h-full" />
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
