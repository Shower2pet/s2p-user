import { branding } from '@/config/branding';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import shower2petLogo from '@/assets/shower2pet-logo.png';

export const CoBrandingHeader = () => {
  return (
    <div className="bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <img 
          src={shower2petLogo} 
          alt="Shower2Pet"
          className="h-10 w-auto object-contain"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <div className="flex items-center gap-2">
          <img 
            src={branding.clientLogoUrl} 
            alt={branding.clientName}
            className="w-9 h-9 object-contain rounded-xl bg-secondary p-1.5"
          />
        </div>
      </div>
    </div>
  );
};
