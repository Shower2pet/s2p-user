import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      <Button
        variant={language === 'it' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('it')}
        className="rounded-full px-3 h-8 text-xs font-bold"
      >
        🇮🇹 IT
      </Button>
      <Button
        variant={language === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('en')}
        className="rounded-full px-3 h-8 text-xs font-bold"
      >
        🇬🇧 EN
      </Button>
    </div>
  );
};
