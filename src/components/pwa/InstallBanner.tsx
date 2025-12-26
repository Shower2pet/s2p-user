import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLanguage } from '@/hooks/useLanguage';

export const InstallBanner = () => {
  const { isInstallable, promptInstall, dismissInstall } = usePWAInstall();
  const { t } = useLanguage();

  if (!isInstallable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-up">
      <div className="bg-primary text-primary-foreground px-4 py-3 shadow-floating">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{t('installApp')}</p>
            <p className="text-xs opacity-80 truncate">{t('installAppDesc')}</p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={promptInstall}
              size="sm"
              variant="secondary"
              className="rounded-full px-4 font-medium"
            >
              <Download className="w-4 h-4 mr-1" />
              {t('install')}
            </Button>
            
            <button
              onClick={dismissInstall}
              className="p-2 hover:bg-primary-foreground/10 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
