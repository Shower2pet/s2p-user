import { AppShell } from '@/components/layout/AppShell';
import { HistoryList } from '@/components/history/HistoryList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { subDays } from 'date-fns';

const History = () => {
  const { t } = useLanguage();
  
  // Mock data
  const sessions = [
    {
      id: '1',
      type: 'session' as const,
      date: new Date(),
      stationName: 'Doccia Bracco',
      duration: 5,
      amount: 1.00,
      status: 'completed' as const,
    },
    {
      id: '2',
      type: 'session' as const,
      date: subDays(new Date(), 3),
      stationName: 'Doccia Bracco',
      duration: 5,
      amount: 1.00,
      status: 'completed' as const,
    },
    {
      id: '3',
      type: 'session' as const,
      date: subDays(new Date(), 7),
      stationName: 'Doccia Bracco',
      duration: 5,
      amount: 1.00,
      status: 'completed' as const,
    },
  ];

  const payments = [
    {
      id: '1',
      type: 'payment' as const,
      date: subDays(new Date(), 1),
      amount: 10.00,
      status: 'completed' as const,
      paymentMethod: 'Credit Card ****1234',
    },
    {
      id: '2',
      type: 'payment' as const,
      date: subDays(new Date(), 15),
      amount: 20.00,
      status: 'completed' as const,
      paymentMethod: 'Credit Card ****1234',
    },
  ];

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('historyTitle')}</h1>
          <p className="text-muted-foreground font-light">
            {t('historyDesc')}
          </p>
        </div>

        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions">{t('sessions')}</TabsTrigger>
            <TabsTrigger value="payments">{t('payments')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sessions" className="space-y-4 mt-6">
            <HistoryList items={sessions} type="session" />
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-4 mt-6">
            <HistoryList items={payments} type="payment" />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default History;
