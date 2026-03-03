import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { Droplets, PawPrint, Sparkles, Heart, Shield } from 'lucide-react';
import shower2petLogo from '@/assets/shower2pet-logo.png';

const AboutUs = () => {
  const { t } = useLanguage();

  const features = [
    { icon: Droplets, title: t('aboutFeature1Title'), desc: t('aboutFeature1Desc') },
    { icon: PawPrint, title: t('aboutFeature2Title'), desc: t('aboutFeature2Desc') },
    { icon: Shield, title: t('aboutFeature3Title'), desc: t('aboutFeature3Desc') },
    { icon: Heart, title: t('aboutFeature4Title'), desc: t('aboutFeature4Desc') },
  ];

  return (
    <AppShell>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-4">
          <img src={shower2petLogo} alt="Shower2Pet" className="h-16 w-auto mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{t('aboutUsTitle')}</h1>
          <p className="text-muted-foreground font-light leading-relaxed">
            {t('aboutUsIntro')}
          </p>
        </div>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{t('aboutMissionTitle')}</h2>
          </div>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            {t('aboutMissionDesc')}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <Card key={i} className="p-4 space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground font-light">{f.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-bold text-foreground">{t('aboutHowTitle')}</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {step}
                </div>
                <p className="text-sm text-muted-foreground font-light pt-0.5">
                  {t(`aboutStep${step}` as any)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground font-light">
            {t('aboutFooter')}
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default AboutUs;
