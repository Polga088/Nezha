import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mail'
import { getAppBaseUrl } from '@/lib/app-url'

const GENERIC_MESSAGE =
  'Si un compte correspond à cette adresse, un email de réinitialisation a été envoyé.'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!emailRaw) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const user = await prisma.user.findUnique({
      where: { email: emailRaw },
    })

    if (!user || user.isActive === false) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const token = randomBytes(32).toString('hex')
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires,
      },
    })

    const base = getAppBaseUrl()
    const link = `${base}/reset-password?token=${encodeURIComponent(token)}`

    await sendMail({
      to: user.email,
      subject: 'Nezha Medical — Réinitialisation du mot de passe',
      text: [
        `Bonjour ${user.nom},`,
        '',
        'Pour définir un nouveau mot de passe, ouvrez le lien ci-dessous (valide 1 h) :',
        link,
        '',
        'Si vous n’avez pas demandé cette réinitialisation, ignorez cet email.',
      ].join('\n'),
      html: [
        `<p>Bonjour ${escapeHtml(user.nom)},</p>`,
        '<p>Pour définir un nouveau mot de passe, cliquez sur le lien ci-dessous (valide 1 h) :</p>',
        `<p><a href="${escapeHtml(link)}">Réinitialiser mon mot de passe</a></p>`,
        '<p>Si vous n’avez pas demandé cette réinitialisation, ignorez cet email.</p>',
      ].join(''),
    })

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (e) {
    console.error('[POST /api/auth/forgot-password]', e)
    return NextResponse.json(
      { error: 'Impossible de traiter la demande pour le moment.' },
      { status: 500 }
    )
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
