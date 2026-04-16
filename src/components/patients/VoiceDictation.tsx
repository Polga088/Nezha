'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'recording' | 'processing';

export type VoiceDictationProps = {
  /** Texte SOAP (ou compte-rendu structuré) renvoyé par l’API */
  onResult: (soapText: string) => void;
  disabled?: boolean;
  className?: string;
};

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return 'audio/webm';
}

export function VoiceDictation({ onResult, disabled, className }: VoiceDictationProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>('audio/webm');

  const cleanupStream = useCallback(() => {
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.stop();
    }
  }, []);

  const sendBlob = useCallback(
    async (blob: Blob) => {
      setPhase('processing');
      try {
        const fd = new FormData();
        fd.append('audio', blob, `dictation.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`);

        const res = await fetch('/api/ai/dictation', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof data?.error === 'string' ? data.error : 'Échec de la dictée IA');
          setPhase('idle');
          return;
        }

        const text = typeof data?.text === 'string' ? data.text : '';
        if (!text) {
          toast.error('Réponse vide');
          setPhase('idle');
          return;
        }

        onResult(text);
        toast.success('Compte-rendu inséré');
      } catch {
        toast.error('Erreur réseau');
      } finally {
        setPhase('idle');
      }
    },
    [onResult]
  );

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone non disponible dans ce navigateur');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      chunksRef.current = [];
      const mime = pickMimeType();
      mimeRef.current = mime;

      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        cleanupStream();
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        if (blob.size < 256) {
          toast.error('Enregistrement trop court');
          setPhase('idle');
          return;
        }
        void sendBlob(blob);
      };

      rec.start(200);
      setPhase('recording');
    } catch {
      toast.error('Accès au microphone refusé ou indisponible');
      setPhase('idle');
    }
  }, [cleanupStream, sendBlob]);

  const toggle = () => {
    if (disabled || phase === 'processing') return;
    if (phase === 'recording') {
      stopRecording();
      return;
    }
    void startRecording();
  };

  const isRecording = phase === 'recording';
  const isBusy = phase === 'processing';

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        size="sm"
        disabled={disabled || isBusy}
        onClick={toggle}
        className={cn('gap-2 min-w-[10rem]', isRecording && 'ring-2 ring-red-400/80')}
        aria-pressed={isRecording}
        aria-label={isRecording ? 'Arrêter la dictée' : 'Démarrer la dictée vocale'}
      >
        {isBusy ? (
          <>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
            Traitement par l&apos;IA…
          </>
        ) : isRecording ? (
          <>
            <span className="flex items-end justify-center gap-0.5 h-5 px-0.5" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-white animate-voice-wave"
                  style={{
                    height: 14,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </span>
            <Square className="h-3.5 w-3.5 fill-current shrink-0" />
            Arrêter
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Dictée IA
          </>
        )}
      </Button>
      {isRecording && (
        <span className="text-[10px] text-slate-500 max-w-[14rem] text-right">
          Cliquez sur « Arrêter » pour envoyer à Whisper puis structurer en SOAP.
        </span>
      )}
    </div>
  );
}
