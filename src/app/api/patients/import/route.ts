import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJwt } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import Papa from 'papaparse'
import type { AssuranceType } from '@/generated/prisma/client'
import { parseAssuranceType, parseOptionalFloat, parseSexe } from '@/lib/patient-fields'

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null
  return await verifyJwt(token)
}

function normKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '')
}

function cell(row: Record<string, string>, ...aliases: string[]): string {
  for (const [key, val] of Object.entries(row)) {
    const nk = normKey(key)
    for (const a of aliases) {
      if (nk === normKey(a)) return val?.trim() ?? ''
    }
  }
  return ''
}

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 500

const ASSURANCE_HINT =
  'AUCUNE, CNSS, CNOPS, FAR, RAMID, MUTUELLE_PRIVEE, AUTRE'

const DATE_FORMAT_HINT = 'Format attendu : JJ/MM/AAAA ou AAAA-MM-JJ'

/**
 * Date de naissance CSV : JJ/MM/AAAA (français) ou AAAA-MM-JJ (ISO).
 * Rejette les dates impossibles (ex. 32/13/2024) via contrôle jour/mois/année.
 */
function parseCsvBirthDate(raw: string): { ok: true; date: Date } | { ok: false } {
  const s = raw.trim()
  if (!s) return { ok: false }

  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (fr) {
    const day = Number(fr[1])
    const month = Number(fr[2])
    const year = Number(fr[3])
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return { ok: false }
    }
    if (year < 1900 || year > 2100) return { ok: false }
    if (month < 1 || month > 12) return { ok: false }
    if (day < 1 || day > 31) return { ok: false }
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { ok: false }
    }
    return { ok: true, date: d }
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return { ok: false }
    }
    if (year < 1900 || year > 2100) return { ok: false }
    if (month < 1 || month > 12) return { ok: false }
    if (day < 1 || day > 31) return { ok: false }
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { ok: false }
    }
    return { ok: true, date: d }
  }

  return { ok: false }
}

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const ct = request.headers.get('content-type') ?? ''
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          error: 'Content-Type attendu : multipart/form-data (champ file)',
          errors: ['Envoyez le fichier avec le champ « file » en multipart/form-data'],
        },
        { status: 400 }
      )
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'Fichier manquant (champ file)',
          errors: ['Aucun fichier reçu — utilisez le champ « file »'],
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: 'Fichier trop volumineux (max 5 Mo)',
          errors: [`Taille du fichier (${Math.round(file.size / 1024)} Ko) : maximum 5 Mo`],
        },
        { status: 400 }
      )
    }

    const text = await file.text()

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
    })

    if (parsed.errors.length > 0) {
      const parseErrs = parsed.errors.map((e) => {
        const row = e.row != null ? ` (ligne fichier ~${e.row + 1})` : ''
        return `Parsing CSV${row} : ${e.message ?? e.code ?? 'erreur'}`
      })
      return NextResponse.json(
        {
          error: 'Fichier CSV invalide',
          errors: parseErrs,
        },
        { status: 400 }
      )
    }

    const rows = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne de données', errors: ['Aucune ligne de données après l’en-tête'] },
        { status: 400 }
      )
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Trop de lignes (max ${MAX_ROWS})`,
          errors: [`Nombre de lignes (${rows.length}) supérieur à la limite (${MAX_ROWS})`],
        },
        { status: 400 }
      )
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2

      try {
        const id = cell(row, 'id')
        const nom = cell(row, 'nom')
        const prenom = cell(row, 'prenom')
        const dateStr = cell(row, 'date_naissance', 'date naissance')

        if (!nom || !prenom || !dateStr) {
          errors.push(
            `Ligne ${lineNum} : champs obligatoires manquants (nom, prenom, date_naissance)`
          )
          continue
        }

        const parsedDob = parseCsvBirthDate(dateStr)
        if (!parsedDob.ok) {
          errors.push(
            `Ligne ${lineNum} : date_naissance invalide (« ${dateStr} ») — ${DATE_FORMAT_HINT}`
          )
          continue
        }
        const dob = parsedDob.date

        const sexeRaw = cell(row, 'sexe')
        const sexe = parseSexe(sexeRaw)
        if (sexeRaw.trim() !== '' && !sexe) {
          errors.push(
            `Ligne ${lineNum} : sexe invalide (« ${sexeRaw.trim()} ») — attendu : MASCULIN ou FEMININ`
          )
          continue
        }

        /** Vide ou uniquement des espaces → défaut AUCUNE (parseAssuranceType('') → undefined). */
        const assuranceRaw = cell(row, 'assuranceType', 'assurance', 'type_assurance').trim()
        let assuranceType: AssuranceType = 'AUCUNE'
        if (assuranceRaw !== '') {
          const parsedA = parseAssuranceType(assuranceRaw)
          if (parsedA === undefined) {
            errors.push(
              `Ligne ${lineNum} : type d'assurance invalide (« ${assuranceRaw} ») — ${ASSURANCE_HINT}`
            )
            continue
          }
          assuranceType = parsedA
        }

        const tailleStr = cell(row, 'taille').trim()
        const poidsStr = cell(row, 'poids').trim()
        const taille = parseOptionalFloat(tailleStr)
        const poids = parseOptionalFloat(poidsStr)
        if (tailleStr !== '' && taille === undefined) {
          errors.push(`Ligne ${lineNum} : taille non numérique (« ${tailleStr} »)`)
          continue
        }
        if (poidsStr !== '' && poids === undefined) {
          errors.push(`Ligne ${lineNum} : poids non numérique (« ${poidsStr} »)`)
          continue
        }
        if (taille !== undefined && (taille < 30 || taille > 250)) {
          errors.push(
            `Ligne ${lineNum} : taille hors plage (${taille} cm — attendu entre 30 et 250)`
          )
          continue
        }
        if (poids !== undefined && (poids < 1 || poids > 500)) {
          errors.push(
            `Ligne ${lineNum} : poids hors plage (${poids} kg — attendu entre 1 et 500)`
          )
          continue
        }

        const matriculeAssurance = cell(row, 'matriculeAssurance', 'matricule_assurance', 'matricule')
        const matricule =
          matriculeAssurance === '' ? null : matriculeAssurance.slice(0, 200)

        const data = {
          nom: nom.slice(0, 200),
          prenom: prenom.slice(0, 200),
          date_naissance: dob,
          tel: emptyToNull(cell(row, 'tel')),
          email: emptyToNull(cell(row, 'email')),
          adresse: emptyToNull(cell(row, 'adresse')),
          allergies: emptyToNull(cell(row, 'allergies')),
          antecedents: emptyToNull(cell(row, 'antecedents')),
          cin: emptyToNull(cell(row, 'cin')),
          sexe: sexe ?? null,
          groupeSanguin: parseGroupe(cell(row, 'groupeSanguin', 'groupe_sanguin')),
          taille: taille ?? null,
          poids: poids ?? null,
          assuranceType,
          matriculeAssurance: matricule,
        }

        if (id) {
          const existing = await prisma.patient.findUnique({ where: { id } })
          if (existing) {
            await prisma.patient.update({ where: { id }, data })
            updated++
            continue
          }
        }

        await prisma.patient.create({ data })
        created++
      } catch (err) {
        console.error('[import row]', err)
        if (isPrismaUniqueViolation(err)) {
          errors.push(
            `Ligne ${lineNum} : enregistrement refusé — valeur en doublon (ex. CIN ou email déjà utilisé)`
          )
        } else {
          const hint =
            err instanceof Error && err.message
              ? ` — ${err.message.slice(0, 120)}`
              : ''
          errors.push(`Ligne ${lineNum} : erreur d’enregistrement${hint}`)
        }
      }
    }

    return NextResponse.json({
      created,
      updated,
      errors,
      message:
        errors.length === 0
          ? `Import terminé : ${created} créé(s), ${updated} mis à jour.`
          : `Import partiel : ${created} créé(s), ${updated} mis à jour, ${errors.length} erreur(s).`,
    })
  } catch (e) {
    console.error('[POST /api/patients/import]', e)
    return NextResponse.json({ error: 'Import impossible' }, { status: 500 })
  }
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}

function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

function parseGroupe(raw: string): string | null {
  const t = raw.trim()
  if (t === '' || t.toUpperCase() === 'INCONNU') return null
  return t
}
