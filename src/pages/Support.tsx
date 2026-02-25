import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

const Support = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error(t('fillAllFields'));
      return;
    }
    toast.success(t('messageSent'));
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/profile')}>
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('helpAndSupport')}</h1>
          <p className="text-muted-foreground font-light">{t('hereToHelp')}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t('faq')}</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left font-bold">{t('faqHowItWorks')}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">{t('faqHowItWorksAnswer')}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left font-bold">{t('faqPaymentMethods')}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">{t('faqPaymentMethodsAnswer')}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left font-bold">{t('faqCredits')}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">{t('faqCreditsAnswer')}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left font-bold">{t('faqSafety')}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">{t('faqSafetyAnswer')}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{t('contactUs')}</h2>
          <p className="text-sm text-muted-foreground font-light mb-6">{t('contactUsDesc')}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" type="text" placeholder={t('yourName')} value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" placeholder="your@email.com" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('message')}</Label>
              <Textarea id="message" placeholder={t('howCanWeHelp')} value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={5} required />
            </div>
            <Button type="submit" variant="default" size="lg" className="w-full">
              <Send className="w-5 h-5" /> {t('sendMessage')}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default Support;
