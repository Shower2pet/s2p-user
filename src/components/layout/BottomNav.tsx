import { Home, CreditCard, History, User } from 'lucide-react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { path: '/', label: t('home'), icon: Home, end: true },
    { path: '/credits', label: t('myCredits'), icon: CreditCard, end: false },
    { path: '/history', label: t('history'), icon: History, end: false },
    { path: '/profile', label: t('profile'), icon: User, end: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border/50 shadow-floating z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto py-1">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 py-2.5 px-3 flex-1 transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-300",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
};
