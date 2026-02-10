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

const Support = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <AppShell showNav={false}>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Help & Support
          </h1>
          <p className="text-muted-foreground font-light">
            We're here to help you
          </p>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Frequently Asked Questions</h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left font-bold">
                How does the dog wash station work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">
                Simply pay for a session or use your credits, and you'll get {5} minutes of access to our self-service station with water and dryer. The station will automatically turn off when your time is up.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left font-bold">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">
                We accept all major credit and debit cards. You can also purchase credits in advance for convenience.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left font-bold">
                How do credits work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">
                1 credit equals €1 and gives you one wash session. You can buy credit packs with bonus credits or subscribe for even better savings.
              </AccordionContent>
            </AccordionItem>


            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left font-bold">
                Is it safe for all dog breeds?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light">
                Yes! Our stations are designed to be safe for dogs of all sizes and breeds. Always supervise your pet and adjust the water pressure as needed.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="text-sm text-muted-foreground font-light mb-6">
            Can't find what you're looking for? Send us a message and we'll respond as soon as possible.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="How can we help you?"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                required
              />
            </div>

            <Button type="submit" variant="default" size="lg" className="w-full">
              <Send className="w-5 h-5" />
              Send Message
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default Support;
