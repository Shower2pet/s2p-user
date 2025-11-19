import { branding } from '@/config/branding';

export const CoBrandingHeader = () => {
  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">S2P</span>
        </div>
        <span className="font-bold text-foreground">{branding.appName}</span>
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
