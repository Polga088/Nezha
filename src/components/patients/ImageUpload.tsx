'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ImageUploadProps = {
  patientId: string;
  /** Libellé optionnel en base */
  label?: string;
  className?: string;
  onUploaded?: (doc: {
    id: string;
    filename: string;
    mimeType: string | null;
    file_url: string | null;
    label: string | null;
    createdAt: string;
  }) => void;
};

/**
 * Input fichier masqué — photos depuis mobile / webcam (`capture`) vers POST /api/patients/[id]/documents.
 */
export function ImageUpload({ patientId, label, className, onUploaded }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !patientId) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (label?.trim()) fd.append('label', label.trim());

      const res = await fetch(`/api/patients/${patientId}/documents`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = raw;
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* brut */
        }
        toast.error(msg);
        return;
      }
      const doc = JSON.parse(raw) as Parameters<NonNullable<ImageUploadProps['onUploaded']>>[0];
      onUploaded?.(doc);
      toast.success(`Photo enregistrée : ${file.name}`);
    } catch {
      toast.error('Échec de l’envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/*,image/heic,image/heif"
        capture="environment"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={loading}
        onClick={pickFile}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        Photo (appareil)
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={pickFile}
        className="gap-2 border-dashed"
      >
        <ImagePlus className="h-4 w-4" />
        Galerie / fichier
      </Button>
      <p className="w-full text-[11px] text-slate-500 dark:text-zinc-400">
        Le premier bouton ouvre souvent l’appareil photo sur mobile ; le second permet de choisir une image
        existante.
      </p>
    </div>
  );
}
