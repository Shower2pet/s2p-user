import { branding } from '@/config/branding';
import { useLanguage } from '@/i18n/LanguageContext';
import logoHorizontal from '@/assets/logo-horizontal.png';

export const CoBrandingHeader = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <img 
          src={logoHorizontal} 
          alt="Shower2Pet"
          className="h-10 object-contain"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'it')}
          className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-light focus:outline-none focus:ring-2 focus:ring-primary z-50"
        >
          <option value="en">EN</option>
          <option value="it">IT</option>
        </select>
        
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
    </div>
  );
};
