import { useLocation, useNavigate } from 'react-router-dom';
import { branding } from '@/config/branding';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import shower2petLogo from '@/assets/shower2pet-logo.png';
import { ArrowLeft } from 'lucide-react';

export const CoBrandingHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {!isHome && (
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-colors duration-200"
            aria-label="Indietro"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <img 
          src={shower2petLogo} 
          alt="Shower2Pet"
          className="h-10 w-auto object-contain"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
      </div>
    </div>
  );
};
