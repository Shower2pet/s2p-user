import { branding } from '@/config/branding';
import shower2petLogo from '@/assets/shower2pet-logo.png';

export const CoBrandingHeader = () => {
  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <img 
          src={shower2petLogo} 
          alt="Shower2Pet"
          className="h-10 w-auto object-contain"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <img 
          src={branding.clientLogoUrl} 
          alt={branding.clientName}
          className="w-10 h-10 object-contain rounded-lg bg-muted p-1"
        />
        <span className="text-sm text-muted-foreground font-light hidden sm:inline">
          {branding.clientName}
        </span>
      </div>
    </div>
  );
};
