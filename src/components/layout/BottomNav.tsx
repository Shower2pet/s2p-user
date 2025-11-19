import { Home, CreditCard, History, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

const BottomNav = () => {
  const { t } = useLanguage();
  
  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/credits', label: t('nav.credits'), icon: CreditCard },
    { path: '/history', label: t('nav.history'), icon: History },
    { path: '/profile', label: t('nav.profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 py-3 px-4 flex-1 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-xs font-light">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export { BottomNav };
