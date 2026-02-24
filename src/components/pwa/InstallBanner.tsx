import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLanguage } from '@/hooks/useLanguage';

export const InstallBanner = () => {
  const { isInstallable, promptInstall, dismissInstall } = usePWAInstall();
  const { t } = useLanguage();

  if (!isInstallable) return null;

  return (
    <div className="fixed top-[68px] left-3 right-3 z-[60] sm:left-auto sm:max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-primary text-primary-foreground px-3 py-2 rounded-2xl shadow-floating">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          
          <p className="text-xs font-medium flex-1 truncate">{t('installApp')}</p>
          
          <Button
            onClick={promptInstall}
            size="sm"
            variant="secondary"
            className="rounded-full px-3 h-7 text-xs font-medium flex-shrink-0"
          >
            <Download className="w-3 h-3 mr-1" />
            {t('install')}
          </Button>
          
          <button
            onClick={dismissInstall}
            className="p-1.5 hover:bg-primary-foreground/10 rounded-full transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
