import { useState, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronRight, Bell, HelpCircle, LogOut, Settings, Camera, Loader2, Crown, LogIn, UserPlus, Info, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { deleteAccount } from '@/services/authService';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile, signOut, user, loading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success(t('logout'));
      navigate('/login');
    } catch (error) {
      toast.error(t('logoutError'));
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

  const petAvatarUrl = useMemo(() => {
    const seed = user?.id || 'default';
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
      <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('myProfile')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-light">{t('manageAccount')}</p>
        </div>

        {user ? (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16">
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
            <p className="text-muted-foreground">{t('loginOrRegisterData')}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/login')} size="lg">
                <LogIn className="w-5 h-5" /> {t('login')}
              </Button>
              <Button onClick={() => navigate('/register')} variant="outline" size="lg">
                <UserPlus className="w-5 h-5" /> {t('register')}
              </Button>
            </div>
          </Card>
        )}

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
            <button onClick={() => navigate('/about')} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">{t('aboutUs')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>

          {user && (
            <>
              <Button onClick={handleLogout} disabled={isLoggingOut} variant="destructive" size="lg" className="w-full mt-6">
                {isLoggingOut ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('loggingOut')}</>
                ) : (
                  <><LogOut className="w-5 h-5" /> {t('logout')}</>
                )}
              </Button>

              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                size="lg"
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-5 h-5" /> {t('deleteAccount')}
              </Button>

              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteAccountConfirm')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('deleteAccountDesc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await deleteAccount();
                          await signOut();
                          toast.success(t('deleteAccountSuccess'));
                          navigate('/');
                        } catch (e) {
                          console.error('[DELETE-ACCOUNT]', e);
                          toast.error(t('genericError'));
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {isDeleting ? t('deleting') : t('deleteAccountConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Profile;
