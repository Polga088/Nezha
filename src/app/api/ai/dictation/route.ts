import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

import { requireStaff } from '@/lib/requireStaff';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SYSTEM_PROMPT =
  'Tu es un assistant médical. Transforme ce texte brut en un compte-rendu médical structuré (SOAP). Langue : Français.';

/** POST multipart/form-data — champ `audio` (fichier) */
export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'Clé API OpenAI manquante (OPENAI_API_KEY).' },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const fileField = formData.get('audio');
  if (!(fileField instanceof File) || fileField.size === 0) {
    return NextResponse.json({ error: 'Fichier audio manquant ou vide' }, { status: 400 });
  }

  const maxBytes = 25 * 1024 * 1024;
  if (fileField.size > maxBytes) {
    return NextResponse.json({ error: 'Audio trop volumineux (max. 25 Mo)' }, { status: 413 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const buffer = Buffer.from(await fileField.arrayBuffer());
    const uploadable = await toFile(
      buffer,
      fileField.name || 'dictation.webm',
      { type: fileField.type || 'audio/webm' }
    );

    const transcription = await openai.audio.transcriptions.create({
      file: uploadable,
      model: 'whisper-1',
      language: 'fr',
    });

    const raw = transcription.text?.trim() ?? '';
    if (!raw) {
      return NextResponse.json({ error: 'Transcription vide' }, { status: 422 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Texte dicté (brut) :\n\n${raw}`,
        },
      ],
    });

    const soap = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!soap) {
      return NextResponse.json({ error: 'Réponse IA vide' }, { status: 502 });
    }

    return NextResponse.json({ text: soap });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur OpenAI';
    console.error('[POST /api/ai/dictation]', e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
