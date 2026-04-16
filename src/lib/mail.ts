import nodemailer from 'nodemailer'

import { prisma } from '@/lib/prisma'

type SendMailArgs = {
  to: string
  subject: string
  text: string
  html?: string
}

type ResolvedSmtp = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

/** Lit la config SMTP (table `GlobalSettings`) avec repli sur les variables d’environnement. */
export async function resolveSmtpConfig(): Promise<ResolvedSmtp | null> {
  let row: Awaited<ReturnType<typeof prisma.globalSettings.findUnique>> = null
  try {
    row = await prisma.globalSettings.findUnique({ where: { id: 'default' } })
  } catch {
    row = null
  }

  const host = row?.smtpHost?.trim() || process.env.SMTP_HOST?.trim()
  const portFromDb = row?.smtpPort
  const portFromEnv = process.env.SMTP_PORT
    ? Number.parseInt(process.env.SMTP_PORT, 10)
    : Number.NaN
  const port =
    portFromDb != null && Number.isFinite(portFromDb)
      ? portFromDb
      : Number.isFinite(portFromEnv)
        ? portFromEnv
        : 587

  const user = row?.smtpUser?.trim() || process.env.SMTP_USER?.trim()
  const pass = row?.smtpPass?.trim() || process.env.SMTP_PASS?.trim()

  const fromRaw =
    row?.smtpFrom?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    'noreply@nezha.local'

  if (!host || !user || !pass) {
    return null
  }

  return {
    host,
    port,
    user,
    pass,
    from: fromRaw,
  }
}

function createTransporter(cfg: ResolvedSmtp) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  })
}

/** Envoie un email ; en dev sans SMTP, log en console. */
export async function sendMail({ to, subject, text, html }: SendMailArgs): Promise<void> {
  const cfg = await resolveSmtpConfig()
  if (!cfg) {
    console.warn('[mail] SMTP non configuré — contenu ci-dessous (dev)')
    console.warn({ to, subject, text })
    return
  }

  const transporter = createTransporter(cfg)
  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html: html ?? text.replace(/\n/g, '<br/>'),
  })
}
