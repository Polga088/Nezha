import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/requireAdmin';
import { buildFinanceStatsCsv, parseFinanceExportDates } from '@/lib/finance-export';

/** GET /api/admin/finance/export?format=csv&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const format = (sp.get('format') ?? 'csv').toLowerCase();

  if (format !== 'csv') {
    return NextResponse.json(
      { error: 'Format non supporté — utilisez format=csv' },
      { status: 400 }
    );
  }

  const dates = parseFinanceExportDates(sp.get('from'), sp.get('to'));
  if ('error' in dates) {
    return NextResponse.json({ error: dates.error }, { status: 400 });
  }

  const statutRaw = sp.get('statut')?.toUpperCase();
  const statut =
    statutRaw === 'PENDING' || statutRaw === 'PAID' || statutRaw === 'CANCELLED' ?
      statutRaw
    : null;

  const doctorId = sp.get('doctorId')?.trim() || null;

  try {
    const csv = await buildFinanceStatsCsv({
      from: dates.from,
      to: dates.to,
      statut,
      doctorId,
    });

    const filename = `nezha-finance-stats-${dates.from.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/finance/export]', e);
    return NextResponse.json({ error: 'Export impossible' }, { status: 500 });
  }
}
