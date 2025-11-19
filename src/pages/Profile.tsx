import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, CreditCard, Bell, Globe, HelpCircle, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground font-light">
            Manage your account settings
          </p>
        </div>

        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                JD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">John Doe</h2>
              <p className="text-sm text-muted-foreground font-light">john.doe@example.com</p>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground px-1">Settings</h2>

          <Card className="divide-y divide-border">
            <button
              onClick={() => navigate('/profile/payment-methods')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">Payment Methods</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/subscriptions')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">Manage Subscription</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">Language</span>
              </div>
              <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-light">
                <option>English</option>
                <option>Italiano</option>
                <option>Español</option>
              </select>
            </div>
          </Card>

          <h2 className="text-lg font-bold text-foreground px-1 pt-4">Notifications</h2>

          <Card className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-light text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground font-light">Receive updates via email</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-light text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground font-light">Get notified on your device</p>
                </div>
              </div>
              <Switch />
            </div>
          </Card>

          <h2 className="text-lg font-bold text-foreground px-1 pt-4">Support</h2>

          <Card>
            <button
              onClick={() => navigate('/support')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-light text-foreground">Help & Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>

          <Button
            onClick={handleLogout}
            variant="destructive"
            size="lg"
            className="w-full mt-6"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default Profile;
