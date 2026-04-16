'use client';

import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ShareDocumentProps = {
  /** Prénom ou nom affiché dans le message WhatsApp */
  patientName: string;
  sharingToken: string;
  /** Libellé accessibilité / variante visuelle mineure */
  label?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
};

function buildWhatsAppUrl(patientName: string, publicUrl: string): string {
  const nom = patientName.trim() || 'Madame, Monsieur';
  const text = `Bonjour ${nom}, votre document médical est prêt. Accédez-y ici en toute sécurité : ${publicUrl}. Votre CIN sera requis pour l'ouverture.`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Ouvre WhatsApp avec un message prérempli pointant vers la page publique /p/[token].
 */
export function ShareDocument({
  patientName,
  sharingToken,
  label = 'Partager',
  className,
  size = 'sm',
  variant = 'outline',
}: ShareDocumentProps) {
  const handleClick = () => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
    const publicUrl = `${origin}/p/${encodeURIComponent(sharingToken)}`;
    const url = buildWhatsAppUrl(patientName, publicUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
    >
      <MessageCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}
