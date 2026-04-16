import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

import { getLicenseJwtSecretBytes } from '@/lib/jwt-env'

/** Cookie httpOnly contenant un JWT de licence (vérifiable en Edge sans Prisma). */
export const LICENSE_COOKIE_NAME = 'nezha_license'

const LICENSE_JWT_SECRET = getLicenseJwtSecretBytes()

const LICENSE_JWT_TYP = 'nezha_license'

type LicenseJwtPayload = {
  typ?: string
  sub?: string
  deviceId?: string
  exp?: number
}

/** Routes accessibles sans licence (activation + endpoints dédiés). */
export const isLicenseExemptPath = (pathname: string): boolean => {
  if (pathname === '/license-activation' || pathname.startsWith('/license-activation/')) {
    return true
  }
  if (pathname === '/api/license' || pathname.startsWith('/api/license/')) {
    return true
  }
  return false
}

export const verifyLicenseJwt = async (
  token: string
): Promise<LicenseJwtPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, LICENSE_JWT_SECRET)
    const p = payload as LicenseJwtPayload
    if (p.typ !== LICENSE_JWT_TYP) return null
    return p
  } catch {
    return null
  }
}

/**
 * Émet le JWT de licence (appelé uniquement depuis la route API d’activation, runtime Node).
 * L’expiration JWT est alignée sur `expiresAt` en base (ou 10 ans si illimitée).
 */
const perpetualJwtExpiry = (): Date =>
  new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)

export const signLicenseJwt = async (args: {
  licenseId: string
  deviceId: string
  expiresAt: Date | null
}): Promise<string> => {
  const expDate = args.expiresAt ?? perpetualJwtExpiry()

  return new SignJWT({
    typ: LICENSE_JWT_TYP,
    deviceId: args.deviceId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(args.licenseId)
    .setIssuedAt()
    .setExpirationTime(expDate)
    .sign(LICENSE_JWT_SECRET)
}

/**
 * Retourne une réponse de blocage si la licence est absente ou invalide, sinon `null`.
 * Compatible Edge : pas d’accès Prisma ici.
 */
export const runLicenseGate = async (
  request: NextRequest
): Promise<NextResponse | null> => {
  if (process.env.SKIP_LICENSE_CHECK === 'true') {
    return null
  }

  const pathname = request.nextUrl.pathname
  if (isLicenseExemptPath(pathname)) {
    return null
  }

  const token = request.cookies.get(LICENSE_COOKIE_NAME)?.value
  if (!token) {
    return denyLicense(request)
  }

  const payload = await verifyLicenseJwt(token)
  if (!payload?.exp) {
    return denyLicense(request)
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = typeof payload.exp === 'number' ? payload.exp : Number(payload.exp)
  if (!Number.isFinite(expSec) || nowSec >= expSec) {
    return denyLicense(request)
  }

  return null
}

const denyLicense = (request: NextRequest): NextResponse => {
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: 'Licence logicielle requise ou expirée.',
        code: 'LICENSE_REQUIRED',
      },
      { status: 403 }
    )
  }

  const url = request.nextUrl.clone()
  url.pathname = '/license-activation'
  url.search = ''
  return NextResponse.redirect(url)
}
