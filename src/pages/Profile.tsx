import { useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, Bell, HelpCircle, LogOut, Settings, Camera, Loader2, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useWallets } from '@/hooks/useWallet';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile, signOut, user, loading: authLoading } = useAuth();
  const { data: wallets } = useWallets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success(t('logout'));
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string | null) => {
    if (firstName) return (firstName[0] + (lastName?.[0] || '')).toUpperCase();
    if (email) return email[0].toUpperCase();
    return 'U';
  };

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User';

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('myProfile')}</h1>
          <p className="text-muted-foreground font-light">{t('manageAccount')}</p>
        </div>

        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {getInitials(profile?.first_name ?? null, profile?.last_name ?? null, profile?.email ?? null)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground font-light">{profile?.email || user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Wallets grouped by structure */}
        {wallets && wallets.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground px-1 flex items-center gap-2">
              <Coins className="w-5 h-5" /> {t('yourCredits')}
            </h2>
            {wallets.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">{w.structure_name || 'Struttura'}</p>
                    <p className="text-xs text-muted-foreground">Saldo disponibile</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">€{w.balance.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Settings */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground px-1">{t('settings')}</h2>
          <Card className="divide-y divide-border">
            <button onClick={() => navigate('/subscriptions')} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">{t('manageSubscription')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>

          <h2 className="text-lg font-bold text-foreground px-1 pt-4">{t('notifications')}</h2>
          <Card className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-light text-foreground">{t('emailNotifications')}</p>
                  <p className="text-xs text-muted-foreground font-light">{t('receiveUpdates')}</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-light text-foreground">{t('pushNotifications')}</p>
                  <p className="text-xs text-muted-foreground font-light">{t('getNotified')}</p>
                </div>
              </div>
              <Switch />
            </div>
          </Card>

          <h2 className="text-lg font-bold text-foreground px-1 pt-4">{t('support')}</h2>
          <Card>
            <button onClick={() => navigate('/support')} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">{t('helpSupport')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>

          <Button onClick={handleLogout} disabled={isLoggingOut} variant="destructive" size="lg" className="w-full mt-6">
            {isLoggingOut ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t('loggingOut')}</>
            ) : (
              <><LogOut className="w-5 h-5" /> {t('logout')}</>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default Profile;
