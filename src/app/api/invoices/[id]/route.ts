import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { JWTPayload } from 'jose'

import { verifyJwt } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { InvoiceModePaiement } from '@/generated/prisma/client'

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null
  return await verifyJwt(token)
}

/** ADMIN, DOCTOR, ASSISTANT, ou utilisateur ayant créé la facture (`createdById`). */
function canDeleteInvoice(user: JWTPayload, invoice: { createdById: string | null }): boolean {
  const role = String(user.role ?? '').toUpperCase()
  if (role === 'ADMIN' || role === 'DOCTOR' || role === 'ASSISTANT') return true
  const uid = user.id != null ? String(user.id) : ''
  if (!uid || !invoice.createdById) return false
  return invoice.createdById === uid
}

const VALID_MODES: InvoiceModePaiement[] = ['CASH', 'CARD', 'CHECK']

function parseModePaiement(raw: unknown): InvoiceModePaiement | null {
  if (typeof raw !== 'string') return null
  const u = raw.trim().toUpperCase()
  return VALID_MODES.includes(u as InvoiceModePaiement) ? (u as InvoiceModePaiement) : null
}

// GET: Détail d'une facture spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, nom: true, prenom: true, cin: true } },
        appointment: {
          include: { patient: true, doctor: { select: { nom: true } } },
        },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    return NextResponse.json(invoice)
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

// PUT: Mettre à jour une facture (par exemple pour passer de PENDING à PAID)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { statut } = body
    const modeParsed = parseModePaiement(body.modePaiement ?? body.methode_paiement)

    const dataToUpdate: {
      statut?: 'PENDING' | 'PAID' | 'CANCELLED'
      datePaiement?: Date | null
      modePaiement?: InvoiceModePaiement
    } = {}

    if (typeof statut === 'string') {
      const s = statut.toUpperCase()
      if (s === 'PENDING' || s === 'PAID' || s === 'CANCELLED') {
        dataToUpdate.statut = s
        if (s === 'PAID') {
          dataToUpdate.datePaiement = new Date()
        }
        if (s === 'PENDING') {
          dataToUpdate.datePaiement = null
        }
      }
    }
    if (modeParsed) {
      dataToUpdate.modePaiement = modeParsed
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

/**
 * DELETE — suppression facture (facturation).
 * Autorisé : ADMIN, DOCTOR, ASSISTANT, ou créateur de la facture (`createdById`).
 * Si liée à un RDV : repasse le RDV en FINISHED (« à encaisser », équivalent workflow PENDING_PAYMENT).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, appointmentId: true, createdById: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    if (!canDeleteInvoice(user, invoice)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    await prisma.$transaction(async (tx) => {
      if (invoice.appointmentId) {
        await tx.appointment.update({
          where: { id: invoice.appointmentId },
          data: { statut: 'FINISHED' },
        })
      }
      await tx.invoice.delete({ where: { id: invoice.id } })
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/invoices/:id]', e)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
