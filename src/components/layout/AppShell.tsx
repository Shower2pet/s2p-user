import { ReactNode } from 'react';
import { CoBrandingHeader } from './CoBrandingHeader';
import { BottomNav } from './BottomNav';
import { InstallBanner } from '@/components/pwa/InstallBanner';

interface AppShellProps {
  children: ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
}

export const AppShell = ({ 
  children, 
  showHeader = true, 
  showNav = true 
}: AppShellProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <CoBrandingHeader />}
      <InstallBanner />
      
      <main className={cn(
        "flex-1 overflow-y-auto",
        showNav && "pb-20"
      )}>
        {children}
      </main>
      
      {showNav && <BottomNav />}
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
