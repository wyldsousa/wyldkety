import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AvatarPreviewDialog } from './AvatarPreviewDialog';

interface ProfileHeaderProps {
  avatarUrl: string | null | undefined;
  fullName: string | null | undefined;
  email: string | undefined;
  userId: string | undefined;
  isEditing: boolean;
  onAvatarUpdated: (url: string) => void;
}

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function resizeImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/webp',
        0.92
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function ProfileHeader({ avatarUrl, fullName, email, userId, isEditing, onAvatarUpdated }: ProfileHeaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(fullName);

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    } else {
      setPreviewOpen(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const resizedFile = await resizeImage(file, 512);
      const fileExt = 'webp';
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedFile, {
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newUrl = publicUrl + '?t=' + Date.now();
      onAvatarUpdated(newUrl);
      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar foto: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isEditing && isUploading}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform hover:scale-105"
            aria-label={isEditing ? 'Alterar foto de perfil' : 'Ver foto de perfil'}
          >
            <Avatar className="w-24 h-24">
              <AvatarImage
                src={avatarUrl || undefined}
                className="object-cover"
                style={{ aspectRatio: '1/1' }}
              />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          {isEditing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <h2 className="text-xl font-semibold text-foreground mt-2">{fullName || 'Usuário'}</h2>
        <p className="text-muted-foreground">{email}</p>
      </div>

      <AvatarPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageUrl={avatarUrl}
        fallbackInitials={initials}
      />
    </>
  );
}
