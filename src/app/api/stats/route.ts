import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Returns raw dataset stats and simple KPIs
export async function GET(_req: NextRequest) {
  try {
    const db = getDb(true);

    // Basic raw stats
    const raw = db.prepare(
      `SELECT 
         COUNT(*) AS total_rows,
         MIN(arrival) AS min_arrival,
         MAX(depart) AS max_depart
       FROM stays`
    ).get() as { total_rows?: number; min_arrival?: string; max_depart?: string };

    // Revenue all-time
    const revAll = db.prepare(
      `SELECT COALESCE(SUM(room_rate), 0) AS total_revenue FROM stays`
    ).get() as { total_revenue?: number };

    // Revenue this month
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;

    const revMonth = db.prepare(
      `SELECT COALESCE(SUM(room_rate), 0) AS total_revenue
       FROM stays WHERE arrival >= ? AND depart <= ?`
    ).get(start, end) as { total_revenue?: number };

    // Approximate ADR using nights from date diff (minimum 1)
    const adrRow = db.prepare(
      `SELECT 
         COALESCE(SUM(room_rate), 0) AS sum_revenue,
         COALESCE(SUM(MAX(1, CAST((julianday(depart) - julianday(arrival)) AS INTEGER))), 0) AS sum_nights
       FROM stays`
    ).get() as { sum_revenue?: number; sum_nights?: number };

    const totalRows = Number(raw?.total_rows ?? 0);
    const totalRevenueAll = Number(revAll?.total_revenue ?? 0);
    const totalRevenueMonth = Number(revMonth?.total_revenue ?? 0);
    const sumRevenue = Number(adrRow?.sum_revenue ?? 0);
    const sumNights = Math.max(0, Number(adrRow?.sum_nights ?? 0));
    const adr = sumNights > 0 ? sumRevenue / sumNights : 0;

    return NextResponse.json({
      success: true,
      data: {
        raw_stats: {
          total_rows: totalRows,
          earliest_arrival: raw?.min_arrival ?? null,
          latest_depart: raw?.max_depart ?? null,
        },
        kpis: {
          revenue_all_time: totalRevenueAll,
          revenue_this_month: totalRevenueMonth,
          adr_approx: adr,
          notes: 'ADR approx uses nights = max(1, date_diff). Occupancy/RevPAR require inventory data.'
        },
        period_month: { start, end }
      }
    });
  } catch (e: any) {
    console.error('API /api/stats error:', e);
    return NextResponse.json({ success: false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
