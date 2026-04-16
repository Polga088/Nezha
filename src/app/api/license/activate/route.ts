import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  LICENSE_COOKIE_NAME,
  signLicenseJwt,
} from '@/lib/license-check'

export const runtime = 'nodejs'

const bodySchema = z.object({
  key: z.string().min(8, 'Clé trop courte').max(512),
  deviceId: z.string().min(8, 'Identifiant appareil invalide').max(256),
})

const secureCookie = process.env.NODE_ENV === 'production'

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const key = parsed.data.key.trim()
  const deviceId = parsed.data.deviceId.trim()

  const license = await prisma.license.findUnique({
    where: { licenseKey: key },
  })

  if (!license) {
    return NextResponse.json({ error: 'Clé de licence inconnue.' }, { status: 401 })
  }

  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Cette licence a expiré.' }, { status: 403 })
  }

  const activatedAt = license.activatedAt ?? new Date()

  await prisma.license.update({
    where: { id: license.id },
    data: {
      activatedAt,
      deviceId,
    },
  })

  const token = await signLicenseJwt({
    licenseId: license.id,
    deviceId,
    expiresAt: license.expiresAt,
  })

  const res = NextResponse.json({
    ok: true,
    message: 'Licence activée.',
    expiresAt: license.expiresAt?.toISOString() ?? null,
  })

  const maxAgeSec = license.expiresAt
    ? Math.max(
        60,
        Math.floor((license.expiresAt.getTime() - Date.now()) / 1000)
      )
    : 60 * 60 * 24 * 365 * 10

  res.cookies.set(LICENSE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/',
    maxAge: maxAgeSec,
  })

  return res
}
