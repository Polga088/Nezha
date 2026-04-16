'use client';

import { useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type PatientBioFieldName = 'allergies' | 'antecedents';

export type PatientBioEditableFieldProps = {
  patientId: string;
  field: PatientBioFieldName;
  title: string;
  value: string | null | undefined;
  variant: 'allergies' | 'antecedents';
  onSaved: (next: string | null) => void;
};

const boxClass: Record<PatientBioEditableFieldProps['variant'], string> = {
  allergies:
    'text-sm text-slate-700 bg-orange-50 border border-orange-100 rounded-lg p-3 leading-relaxed min-h-[3rem]',
  antecedents:
    'text-sm text-slate-700 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed min-h-[3rem]',
};

const emptyClass =
  'text-sm text-slate-400 italic bg-slate-50 rounded-lg p-3 border border-slate-100 min-h-[3rem]';

export const PatientBioEditableField = ({
  patientId,
  field,
  title,
  value,
  variant,
  onSaved,
}: PatientBioEditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) setDraft(value ?? '');
  }, [value, isEditing]);

  const displayText = value?.trim() ? value : null;
  const emptyLabel =
    field === 'allergies'
      ? 'Aucune allergie documentée.'
      : 'Aucun antécédent documenté.';

  const handleToggleEdit = () => {
    if (isEditing) {
      setDraft(value ?? '');
      setIsEditing(false);
      return;
    }
    setDraft(value ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ [field]: draft.trim() === '' ? null : draft.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Enregistrement impossible');
        return;
      }
      const next = draft.trim() === '' ? null : draft.trim();
      onSaved(next);
      setIsEditing(false);
      toast.success('Informations enregistrées');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-500 hover:text-blue-600"
          onClick={() => handleToggleEdit()}
          aria-label={isEditing ? `Annuler l’édition — ${title}` : `Modifier ${title}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="resize-y min-h-[120px]"
            aria-label={title}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void handleSave()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setDraft(value ?? '');
                setIsEditing(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : displayText ? (
        <p className={boxClass[variant]}>{displayText}</p>
      ) : (
        <p className={emptyClass}>{emptyLabel}</p>
      )}
    </div>
  );
};
