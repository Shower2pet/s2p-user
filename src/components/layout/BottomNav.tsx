import { Home, CreditCard, History, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { path: '/', label: t('home'), icon: Home },
    { path: '/credits', label: t('myCredits'), icon: CreditCard },
    { path: '/history', label: t('history'), icon: History },
    { path: '/profile', label: t('profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border/50 shadow-floating z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto py-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 py-2.5 px-3 flex-1 text-muted-foreground transition-all duration-300"
            activeClassName="text-primary"
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
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
