import { useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, CreditCard, Bell, HelpCircle, LogOut, Settings, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile, signOut, refreshProfile, user, loading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success(t('changePhoto'));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error uploading photo');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

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
          <p className="text-muted-foreground font-light">
            {t('manageAccount')}
          </p>
        </div>

        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {getInitials(profile?.full_name, profile?.email)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">
                {profile?.full_name || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                {profile?.email || user?.email}
              </p>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground px-1">{t('settings')}</h2>

          <Card className="divide-y divide-border">
            <button
              onClick={() => navigate('/profile/payment-methods')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">{t('paymentMethods')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/subscriptions')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
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
            <button
              onClick={() => navigate('/support')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">{t('helpSupport')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>

          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="destructive"
            size="lg"
            className="w-full mt-6"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('loggingOut')}
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                {t('logout')}
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default Profile;
