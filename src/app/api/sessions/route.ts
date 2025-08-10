import { NextRequest, NextResponse } from 'next/server';
import { createSession, listSessions } from '@/server/session';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || undefined;
  const items = listSessions(q || undefined);
  return NextResponse.json({ success: true, items });
}

export async function POST(req: NextRequest) {
  const { title } = await req.json().catch(() => ({}));
  const sess = createSession(title || 'New Chat');
  return NextResponse.json({ success: true, session: sess });
}
