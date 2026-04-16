import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJwt } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import { format } from 'date-fns'

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null
  return await verifyJwt(token)
}

const CSV_COLUMNS = [
  'id',
  'nom',
  'prenom',
  'date_naissance',
  'tel',
  'email',
  'adresse',
  'cin',
  'sexe',
  'groupeSanguin',
  'taille',
  'poids',
  'allergies',
  'antecedents',
  'assuranceType',
  'matriculeAssurance',
  'createdAt',
] as const

function csvEscapeCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  let s = String(val)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const header = CSV_COLUMNS.join(',')
    const lines = patients.map((p) =>
      [
        p.id,
        p.nom,
        p.prenom,
        format(p.date_naissance, 'yyyy-MM-dd'),
        p.tel ?? '',
        p.email ?? '',
        p.adresse ?? '',
        p.cin ?? '',
        p.sexe ?? '',
        p.groupeSanguin ?? '',
        p.taille ?? '',
        p.poids ?? '',
        p.allergies ?? '',
        p.antecedents ?? '',
        p.assuranceType,
        p.matriculeAssurance ?? '',
        p.createdAt.toISOString(),
      ]
        .map(csvEscapeCell)
        .join(',')
    )

    const bom = '\uFEFF'
    const csv = bom + [header, ...lines].join('\r\n') + '\r\n'

    const stamp = format(new Date(), 'yyyy-MM-dd')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="patients-export-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/patients/export]', e)
    return NextResponse.json({ error: 'Export impossible' }, { status: 500 })
  }
}
