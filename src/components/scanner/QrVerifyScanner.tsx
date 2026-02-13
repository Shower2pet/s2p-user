import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface QrVerifyScannerProps {
  expectedStationId: string;
  onVerified: () => void;
  onClose: () => void;
}

export const QrVerifyScanner = ({ expectedStationId, onVerified, onClose }: QrVerifyScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scannerId = 'qr-verify-reader';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          let stationId = decodedText.trim();
          const urlMatch = stationId.match(/\/s\/([^/?#]+)/);
          if (urlMatch) {
            stationId = urlMatch[1];
          }

          scanner.stop().catch(() => {});

          if (stationId.toLowerCase() === expectedStationId.toLowerCase()) {
            toast.success('QR verificato! Accesso sbloccato.');
            onVerified();
          } else {
            toast.error('Il QR code non corrisponde a questa stazione.');
            onClose();
          }
        },
        () => {}
      )
      .catch((err) => {
        console.error('QR Verify Scanner error:', err);
        setError('Impossibile accedere alla fotocamera. Verifica i permessi.');
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [expectedStationId, onVerified, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <p className="text-white text-sm mb-2 font-medium">Scansiona il QR code della stazione</p>
      <p className="text-white/60 text-xs mb-4">Necessario per sbloccare l'accesso riservato</p>

      <div className="w-[300px] h-[300px] relative rounded-2xl overflow-hidden">
        <div id="qr-verify-reader" className="w-full h-full" />
      </div>

      {error && (
        <div className="mt-4 text-center px-6">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 text-white border-white/30" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      )}
    </div>
  );
};
