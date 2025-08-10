import { NextRequest, NextResponse } from 'next/server';
import { addMessage, getMessages, getOrCreateSession } from '@/server/session';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const items = getMessages(id);
  return NextResponse.json({ success: true, items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const role = (body?.role || 'user') as 'user' | 'assistant' | 'system';
  const content = String(body?.content || '');
  const session = getOrCreateSession(id);
  const msg = addMessage(session.id, role, content);
  return NextResponse.json({ success: true, message: msg, session });
}
