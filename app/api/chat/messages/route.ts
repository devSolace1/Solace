import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';
import { verifyUserIdentity } from '../../../../lib/auth-middleware';

const DATING_KEYWORDS = [
  'date',
  'dating',
  'love',
  'kiss',
  'phone',
  'snap',
  'instagram',
  'tinder',
  'meet up',
];

function containsDatingKeyword(text: string) {
  const normalized = text.toLowerCase();
  return DATING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  const userId = req.nextUrl.searchParams.get('userId');
  if (!sessionId || !userId) {
    return NextResponse.json({ error: 'Missing sessionId or userId' }, { status: 400 });
  }

  if (!(await verifyUserIdentity(req, userId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at, is_flagged')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, senderId, content } = body as {
    sessionId: string;
    senderId: string;
    content: string;
  };

  if (!sessionId || !senderId || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!(await verifyUserIdentity(req, senderId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const isFlagged = containsDatingKeyword(content);

  const { error } = await supabase.from('messages').insert({
    session_id: sessionId,
    sender_id: senderId,
    content,
    is_flagged: isFlagged,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok', flagged: isFlagged });
}
