import { Home, CreditCard, History, User, MapPin } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { path: '/', label: t('home'), icon: Home },
    { path: '/map', label: t('map'), icon: MapPin },
    { path: '/credits', label: t('myCredits'), icon: CreditCard },
    { path: '/history', label: t('history'), icon: History },
    { path: '/profile', label: t('profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-light">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
