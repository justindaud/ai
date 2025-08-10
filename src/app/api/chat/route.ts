import { NextRequest, NextResponse } from 'next/server';
import { run } from '@openai/agents';
import { analyticsAgent } from '@/server/agent';
import { orchestrateHotelAnalytics } from '@/server/orchestrator';
import { getDb } from '@/lib/db';
import { addMessage, getOrCreateSession } from '@/server/session';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    let message: string = '';
    let sessionId: string | undefined;
    try {
      const parsed = JSON.parse(bodyText || '{}');
      message = String(parsed?.message ?? '');
      sessionId = parsed?.sessionId ? String(parsed.sessionId) : undefined;
    } catch {
      message = bodyText || '';
    }
    const q = String(message || '').toLowerCase();

    // Ensure session exists
    const session = getOrCreateSession(sessionId, message.slice(0, 80));
    addMessage(session.id, 'user', message);

    // Deterministic fallback for revenue-like queries
    if (/(total\s+)?revenue|pendapatan|omzet/.test(q)) {
      const { start, end } = parseTimeframeForId(q);
      const db = getDb(true);
      const row = db
        .prepare('SELECT SUM(room_rate) AS total FROM stays WHERE arrival >= ? AND depart <= ?')
        .get(start, end) as { total?: number } | undefined;
      const total = Number(row?.total ?? 0);
      const output = `Total revenue ${formatPeriodLabel(start, end)}: Rp ${formatIDR(total)}`;
      addMessage(session.id, 'assistant', output);
      return NextResponse.json({ output, meta: { metric: 'total_revenue', start, end, value: total }, sessionId: session.id });
    }

    // Use orchestrator for intelligent agent routing
    const result = await orchestrateHotelAnalytics(q);
    const output = String(result.response ?? '');
    addMessage(session.id, 'assistant', output);
    return NextResponse.json({ 
      output,
      orchestrationUsed: result.orchestration_used,
      agentsInvolved: result.agents_involved,
      fallbackReason: result.fallback_reason,
      sessionId: session.id,
      // propagate approval info when present
      requiresApproval: (result as any).requires_approval ?? false,
      approvalRequests: (result as any).approval_requests ?? undefined
    });
  } catch (e: any) {
    console.error('API /api/chat error:', e);
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function endOfMonth(y: number, m: number) {
  return new Date(y, m, 0);
}

function parseTimeframeForId(text: string) {
  const months: Record<string, number> = {
    januari: 1,
    februari: 2,
    febuari: 2,
    maret: 3,
    april: 4,
    mei: 5,
    juni: 6,
    juli: 7,
    agustus: 8,
    september: 9,
    oktober: 10,
    november: 11,
    desember: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    agu: 8,
    sep: 9,
    okt: 10,
    nov: 11,
    des: 12,
  };
  const now = new Date();
  const norm = text.toLowerCase();
  if (/bulan\s+ini/.test(norm)) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = `${y}-${pad(m)}-01`;
    const eom = endOfMonth(y, m);
    const end = `${y}-${pad(m)}-${pad(eom.getDate())}`;
    return { start, end };
  }
  if (/bulan\s+lalu/.test(norm)) {
    const d = new Date(now.getFullYear(), now.getMonth(), 0);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const start = `${y}-${pad(m)}-01`;
    const end = `${y}-${pad(m)}-${pad(d.getDate())}`;
    return { start, end };
  }
  const mY = norm.match(
    /(januari|februari|febuari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)\s+(\d{4})/
  );
  if (mY) {
    const m = months[mY[1]] || 1;
    const y = parseInt(mY[2], 10);
    const start = `${y}-${pad(m)}-01`;
    const eom = endOfMonth(y, m);
    const end = `${y}-${pad(m)}-${pad(eom.getDate())}`;
    return { start, end };
  }
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const start = `${y}-${pad(m)}-01`;
  const eom = endOfMonth(y, m);
  const end = `${y}-${pad(m)}-${pad(eom.getDate())}`;
  return { start, end };
}

function formatIDR(n: number) {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function formatPeriodLabel(start: string, end: string) {
  const [ys, ms] = start.split('-').map(Number);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return `${monthNames[(ms || 1) - 1]} ${ys}`;
}

// Extend orchestrator response typing hints (non-breaking)
declare global {
  // eslint-disable-next-line no-var
  var __typehint: unknown;
}

