import { endOfDay, startOfDay } from 'date-fns'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { verifyJwt } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { InvoiceModePaiement } from '@/generated/prisma/client'

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null
  return await verifyJwt(token)
}

const VALID_MODES: InvoiceModePaiement[] = ['CASH', 'CARD', 'CHECK']

function parseModePaiement(raw: unknown): InvoiceModePaiement | null {
  if (typeof raw !== 'string') return null
  const u = raw.trim().toUpperCase()
  return VALID_MODES.includes(u as InvoiceModePaiement) ? (u as InvoiceModePaiement) : null
}

// GET — liste admin OU revenus du jour (assistant / admin).
export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const role = String(user.role).toUpperCase()

  const { searchParams } = new URL(request.url)
  const revenusJour = searchParams.get('revenusJour') === '1' || searchParams.get('revenus') === 'jour'

  if (revenusJour) {
    if (role !== 'ADMIN' && role !== 'ASSISTANT' && role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const now = new Date()
    const from = startOfDay(now)
    const to = endOfDay(now)
    try {
      const [agg, count] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            statut: 'PAID',
            createdAt: { gte: from, lte: to },
          },
          _sum: { montant: true },
        }),
        prisma.invoice.count({
          where: {
            statut: 'PAID',
            createdAt: { gte: from, lte: to },
          },
        }),
      ])
      return NextResponse.json({
        date: from.toISOString().slice(0, 10),
        totalMontant: Number(agg._sum.montant ?? 0),
        nombreFacturesPayees: count,
      })
    } catch {
      return NextResponse.json({ error: 'Erreur lors du calcul des revenus' }, { status: 500 })
    }
  }

  if (role !== 'ADMIN' && role !== 'DOCTOR') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const status = searchParams.get('statut')

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        ...(status ? { statut: status as 'PENDING' | 'PAID' | 'CANCELLED' } : {}),
      },
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        appointment: {
          include: { patient: { select: { id: true, nom: true, prenom: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la récupération des factures' }, { status: 500 })
  }
}

// POST — encaissement (accueil / admin) — RDV en statut FINISHED.
export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const role = String(user.role).toUpperCase()
  if (role !== 'ASSISTANT' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { appointment_id, montant } = body
    const modePaiement = parseModePaiement(body.modePaiement ?? body.methode_paiement)

    if (!appointment_id || montant == null || !modePaiement) {
      return NextResponse.json(
        { error: 'Champs obligatoires : appointment_id, montant, mode de paiement (CASH, CARD, CHECK)' },
        { status: 400 }
      )
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: { id: true, statut: true, patient_id: true },
    })
    if (!appt) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })
    }
    if (appt.statut !== 'FINISHED') {
      return NextResponse.json(
        {
          error:
            'Encaissement réservé aux consultations clôturées par le médecin (statut à encaisser)',
        },
        { status: 400 }
      )
    }

    const existing = await prisma.invoice.findUnique({
      where: { appointmentId: appointment_id },
    })

    if (existing) {
      return NextResponse.json({ error: 'Une facture existe déjà pour ce rendez-vous' }, { status: 400 })
    }

    const createdById =
      user.id !== undefined && user.id !== null ? String(user.id) : undefined

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          patientId: appt.patient_id,
          appointmentId: appointment_id,
          montant: Number.parseFloat(String(montant)),
          modePaiement,
          statut: 'PAID',
          datePaiement: new Date(),
          ...(createdById ? { createdById } : {}),
        },
      })
      await tx.appointment.update({
        where: { id: appointment_id },
        data: { statut: 'PAID' },
      })
      return inv
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la création de la facture' }, { status: 500 })
  }
}
