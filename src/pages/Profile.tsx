import { useState, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, Bell, HelpCircle, LogOut, Settings, Camera, Loader2, Coins, Crown, LogIn, UserPlus } from 'lucide-react';
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

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const displayName = fullName || profile?.email || user?.email || 'Utente';

  // Deterministic pet avatar - uses adorable animal illustrations
  const petAvatarUrl = useMemo(() => {
    const seed = user?.id || 'default';
    // Using "adventurer" style with pet-like seeds for cute animal avatars
    const petSeeds = ['Bella', 'Max', 'Luna', 'Charlie', 'Daisy', 'Buddy', 'Coco', 'Rocky', 'Milo', 'Lola'];
    const idx = seed.charCodeAt(0) % petSeeds.length;
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${petSeeds[idx]}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&shapeColor=0a5b83,1c799f,69d2e7,f1f4dc,f88c49`;
  }, [user?.id]);

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
        {user ? (
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={petAvatarUrl} alt="Pet avatar" />
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
        ) : (
          <Card className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Accedi o registrati per visualizzare i tuoi dati</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/login')} size="lg">
                <LogIn className="w-5 h-5" /> Accedi
              </Button>
              <Button onClick={() => navigate('/register')} variant="outline" size="lg">
                <UserPlus className="w-5 h-5" /> Registrati
              </Button>
            </div>
          </Card>
        )}

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

        {/* Notifications */}
        <div className="space-y-3">
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
          <Card className="divide-y divide-border">
            <button onClick={() => navigate('/support')} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">{t('helpSupport')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>

          {user && (
            <Button onClick={handleLogout} disabled={isLoggingOut} variant="destructive" size="lg" className="w-full mt-6">
              {isLoggingOut ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t('loggingOut')}</>
              ) : (
                <><LogOut className="w-5 h-5" /> {t('logout')}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Profile;
