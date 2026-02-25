import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { reportProblem } from '@/services/maintenanceService';

interface ReportProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
}

export const ReportProblemDialog = ({ open, onOpenChange, stationId }: ReportProblemDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) { toast.error(t('loginToReport')); navigate('/login'); return; }
    if (!description.trim()) { toast.error(t('enterDescription')); return; }
    setIsSubmitting(true);
    try {
      await reportProblem(stationId, user.id, description.trim(), 'low');
      toast.success(t('reportSent'));
      setDescription('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Report error:', err);
      toast.error(t('reportError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t('reportProblemTitle')}
          </DialogTitle>
          <DialogDescription>{t('reportProblemDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('description')}</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={t('describeProblem')} rows={4} maxLength={500} />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !description.trim()}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {t('sendReport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
