import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
    }

    const password_hash = await hashPassword(password)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' })
  } catch (e) {
    console.error('[POST /api/auth/reset-password]', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
