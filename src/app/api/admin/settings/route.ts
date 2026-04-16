import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBrandingPatch } from '@/lib/cabinet-branding';
import { ensureGlobalSettings } from '@/lib/global-settings';
import { requireAdmin } from '@/lib/requireAdmin';
import { requireStaff } from '@/lib/requireStaff';
import {
  PAYMENT_METHOD_CODES,
  isCabinetPaymentCode,
} from '@/lib/payment-method-codes';

const CURRENCIES = ['EUR', 'MAD', 'USD', 'GBP', 'CHF'] as const;
type CurrencyCode = (typeof CURRENCIES)[number];

function isCurrency(s: unknown): s is CurrencyCode {
  return typeof s === 'string' && CURRENCIES.includes(s as CurrencyCode);
}

const BRANDING_PATCH_KEYS = [
  'cabinetName',
  'doctorDisplayName',
  'logoUrl',
  'cabinetPhone',
  'cabinetEmail',
  'cabinetAddress',
  'cabinetCityLine',
  'doctorInpe',
  'doctorSpecialty',
  'mapEmbedUrl',
  'openingHours',
] as const;

function normalizePaymentMethods(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const out: string[] = [];
  for (const x of input) {
    if (!isCabinetPaymentCode(x)) return null;
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

function hasBrandingKeys(body: Record<string, unknown>): boolean {
  return BRANDING_PATCH_KEYS.some((k) => k in body);
}

const SMTP_PATCH_KEYS = [
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpPass',
  'smtpFrom',
] as const;

function hasSmtpKeys(body: Record<string, unknown>): boolean {
  return SMTP_PATCH_KEYS.some((k) => k in body);
}

/** GET /api/admin/settings — staff : facturation + identité cabinet (valeurs brutes DB). */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const row = await ensureGlobalSettings();
  return NextResponse.json({
    id: row.id,
    currency: row.currency,
    defaultConsultationPrice: row.defaultConsultationPrice,
    acceptedPaymentMethods: row.acceptedPaymentMethods,
    signatureUrl: row.signatureUrl,
    cabinetName: row.cabinetName,
    doctorDisplayName: row.doctorDisplayName,
    logoUrl: row.logoUrl,
    cabinetPhone: row.cabinetPhone,
    cabinetEmail: row.cabinetEmail,
    cabinetAddress: row.cabinetAddress,
    cabinetCityLine: row.cabinetCityLine,
    doctorInpe: row.doctorInpe,
    doctorSpecialty: row.doctorSpecialty,
    mapEmbedUrl: row.mapEmbedUrl,
    openingHours: row.openingHours,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpFrom: row.smtpFrom,
    smtpPasswordSet: Boolean(row.smtpPass && String(row.smtpPass).length > 0),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/** PATCH /api/admin/settings — financier + identité cabinet (admin uniquement). */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const bodyRaw = await request.json();
    const body = typeof bodyRaw === 'object' && bodyRaw !== null ? (bodyRaw as Record<string, unknown>) : {};

    const currencyIn = 'currency' in body ? body.currency : undefined;
    const priceIn = 'defaultConsultationPrice' in body ? body.defaultConsultationPrice : undefined;
    const methodsIn = 'acceptedPaymentMethods' in body ? body.acceptedPaymentMethods : undefined;
    const signatureUrlIn = 'signatureUrl' in body ? body.signatureUrl : undefined;

    const hasFinancial =
      currencyIn !== undefined ||
      priceIn !== undefined ||
      methodsIn !== undefined ||
      signatureUrlIn !== undefined;

    const brandingPresent = hasBrandingKeys(body);
    const smtpPresent = hasSmtpKeys(body);

    if (!hasFinancial && !brandingPresent && !smtpPresent) {
      return NextResponse.json(
        {
          error:
            'Fournir au moins un champ : devise, prix, paiements, signature, identité cabinet, ou configuration SMTP',
        },
        { status: 400 }
      );
    }

    if (currencyIn !== undefined && !isCurrency(currencyIn)) {
      return NextResponse.json(
        { error: `Devise invalide (${CURRENCIES.join(', ')})` },
        { status: 400 }
      );
    }

    if (
      priceIn !== undefined &&
      (typeof priceIn !== 'number' || Number.isNaN(priceIn) || priceIn < 0)
    ) {
      return NextResponse.json(
        { error: 'defaultConsultationPrice doit être un nombre ≥ 0' },
        { status: 400 }
      );
    }

    if (methodsIn !== undefined) {
      const normalized = normalizePaymentMethods(methodsIn);
      if (normalized === null) {
        return NextResponse.json(
          {
            error: `acceptedPaymentMethods doit être un tableau de codes : ${PAYMENT_METHOD_CODES.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    if (
      signatureUrlIn !== undefined &&
      signatureUrlIn !== null &&
      typeof signatureUrlIn !== 'string'
    ) {
      return NextResponse.json(
        { error: 'signatureUrl doit être une chaîne ou null' },
        { status: 400 }
      );
    }

    let brandingParsed: ReturnType<typeof parseBrandingPatch> | null = null;
    if (brandingPresent) {
      brandingParsed = parseBrandingPatch(body);
      if (!brandingParsed.ok) {
        return NextResponse.json({ error: brandingParsed.error }, { status: 400 });
      }
      if (Object.keys(brandingParsed.data).length === 0) {
        return NextResponse.json(
          { error: 'Aucun champ d’identité cabinet reconnu dans la requête' },
          { status: 400 }
        );
      }
    }

    await ensureGlobalSettings();

    const data: Record<string, unknown> = {};

    if (currencyIn !== undefined) data.currency = currencyIn;
    if (priceIn !== undefined) data.defaultConsultationPrice = priceIn;
    if (methodsIn !== undefined) {
      data.acceptedPaymentMethods = normalizePaymentMethods(methodsIn)!;
    }
    if (signatureUrlIn !== undefined) {
      const s = signatureUrlIn === null ? null : String(signatureUrlIn).trim();
      data.signatureUrl = s === '' ? null : s;
    }

    if (brandingParsed?.ok) {
      const b = brandingParsed.data;
      if (b.cabinetName !== undefined) data.cabinetName = b.cabinetName;
      if (b.doctorDisplayName !== undefined) data.doctorDisplayName = b.doctorDisplayName;
      if (b.logoUrl !== undefined) data.logoUrl = b.logoUrl;
      if (b.cabinetPhone !== undefined) data.cabinetPhone = b.cabinetPhone;
      if (b.cabinetEmail !== undefined) data.cabinetEmail = b.cabinetEmail;
      if (b.cabinetAddress !== undefined) data.cabinetAddress = b.cabinetAddress;
      if (b.cabinetCityLine !== undefined) data.cabinetCityLine = b.cabinetCityLine;
      if (b.doctorInpe !== undefined) data.doctorInpe = b.doctorInpe;
      if (b.doctorSpecialty !== undefined) data.doctorSpecialty = b.doctorSpecialty;
      if (b.mapEmbedUrl !== undefined) data.mapEmbedUrl = b.mapEmbedUrl;
      if (b.openingHours !== undefined) data.openingHours = b.openingHours;
    }

    if (smtpPresent) {
      const hostIn = 'smtpHost' in body ? body.smtpHost : undefined;
      const portIn = 'smtpPort' in body ? body.smtpPort : undefined;
      const userIn = 'smtpUser' in body ? body.smtpUser : undefined;
      const passIn = 'smtpPass' in body ? body.smtpPass : undefined;
      const fromIn = 'smtpFrom' in body ? body.smtpFrom : undefined;

      if (hostIn !== undefined) {
        if (hostIn === null) {
          data.smtpHost = null;
        } else if (typeof hostIn !== 'string') {
          return NextResponse.json({ error: 'smtpHost doit être une chaîne ou null' }, { status: 400 });
        } else {
          const t = hostIn.trim();
          data.smtpHost = t === '' ? null : t.slice(0, 255);
        }
      }

      if (portIn !== undefined) {
        if (portIn === null) {
          data.smtpPort = null;
        } else if (typeof portIn === 'number' && Number.isInteger(portIn)) {
          if (portIn < 1 || portIn > 65535) {
            return NextResponse.json({ error: 'smtpPort doit être entre 1 et 65535' }, { status: 400 });
          }
          data.smtpPort = portIn;
        } else if (typeof portIn === 'string') {
          const trimmed = portIn.trim();
          if (trimmed === '') {
            data.smtpPort = null;
          } else {
            const n = Number.parseInt(trimmed, 10);
            if (!Number.isFinite(n) || n < 1 || n > 65535) {
              return NextResponse.json({ error: 'smtpPort invalide' }, { status: 400 });
            }
            data.smtpPort = n;
          }
        } else {
          return NextResponse.json({ error: 'smtpPort invalide' }, { status: 400 });
        }
      }

      if (userIn !== undefined) {
        if (userIn === null) {
          data.smtpUser = null;
        } else if (typeof userIn !== 'string') {
          return NextResponse.json({ error: 'smtpUser doit être une chaîne ou null' }, { status: 400 });
        } else {
          const t = userIn.trim();
          data.smtpUser = t === '' ? null : t.slice(0, 255);
        }
      }

      if (fromIn !== undefined) {
        if (fromIn === null) {
          data.smtpFrom = null;
        } else if (typeof fromIn !== 'string') {
          return NextResponse.json({ error: 'smtpFrom doit être une chaîne ou null' }, { status: 400 });
        } else {
          const t = fromIn.trim();
          data.smtpFrom = t === '' ? null : t.slice(0, 255);
        }
      }

      if (passIn !== undefined) {
        if (passIn === null || passIn === '') {
          /* ne pas effacer le mot de passe : chaîne vide = conserver l’existant */
        } else if (typeof passIn !== 'string') {
          return NextResponse.json({ error: 'smtpPass doit être une chaîne' }, { status: 400 });
        } else {
          data.smtpPass = passIn.slice(0, 500);
        }
      }
    }

    const row = await prisma.globalSettings.update({
      where: { id: 'default' },
      data: data as Parameters<typeof prisma.globalSettings.update>[0]['data'],
    });

    return NextResponse.json({
      id: row.id,
      currency: row.currency,
      defaultConsultationPrice: row.defaultConsultationPrice,
      acceptedPaymentMethods: row.acceptedPaymentMethods,
      signatureUrl: row.signatureUrl,
      cabinetName: row.cabinetName,
      doctorDisplayName: row.doctorDisplayName,
      logoUrl: row.logoUrl,
      cabinetPhone: row.cabinetPhone,
      cabinetEmail: row.cabinetEmail,
      cabinetAddress: row.cabinetAddress,
      cabinetCityLine: row.cabinetCityLine,
      doctorInpe: row.doctorInpe,
      doctorSpecialty: row.doctorSpecialty,
      mapEmbedUrl: row.mapEmbedUrl,
      openingHours: row.openingHours,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpUser: row.smtpUser,
      smtpFrom: row.smtpFrom,
      smtpPasswordSet: Boolean(row.smtpPass && String(row.smtpPass).length > 0),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('[admin/settings] PATCH', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
