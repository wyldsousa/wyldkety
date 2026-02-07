import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AvatarPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null | undefined;
  fallbackInitials: string;
}

export function AvatarPreviewDialog({ open, onOpenChange, imageUrl, fallbackInitials }: AvatarPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-0 bg-black/95 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Foto de perfil"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        ) : (
          <div className="w-64 h-64 rounded-full bg-primary flex items-center justify-center">
            <span className="text-6xl font-bold text-primary-foreground">{fallbackInitials}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
