import { useEffect, useRef, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scannerId = 'qr-reader';
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

          // Stop scanner first, then navigate after a brief delay to avoid DOM conflicts
          scanner.stop().catch(() => {}).finally(() => {
            toast.success('QR code letto!');
            onClose();
            // Use setTimeout to ensure the scanner DOM is fully cleaned up before navigation
            setTimeout(() => {
              navigate(`/s/${stationId}`);
            }, 100);
          });
        },
        () => {} // ignore scan failures (no QR in frame)
      )
      .catch((err) => {
        console.error('QR Scanner error:', err);
        setError('Impossibile accedere alla fotocamera. Verifica i permessi.');
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [navigate, onClose]);

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
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 text-white border-white/30" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      )}
    </div>
  );
};
