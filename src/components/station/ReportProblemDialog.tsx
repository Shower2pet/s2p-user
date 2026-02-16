import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Devi effettuare il login per segnalare un problema');
      navigate('/login');
      return;
    }

    if (!description.trim()) {
      toast.error('Inserisci una descrizione del problema');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportProblem(stationId, user.id, description.trim(), 'low');
      toast.success('Segnalazione inviata con successo!');
      setDescription('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Report error:', err);
      toast.error('Errore nell\'invio della segnalazione');
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
            Segnala un Problema
          </DialogTitle>
          <DialogDescription>
            Descrivi il problema riscontrato con questa stazione. Il team lo prenderà in carico.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Descrizione *</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi il problema riscontrato..." rows={4} maxLength={500} />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !description.trim()}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Invia Segnalazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
