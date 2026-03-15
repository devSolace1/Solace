import { NextRequest, NextResponse } from 'next/server';
import { AICompanionService } from '../../../../services/aiCompanion';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, context } = body as {
    message: string;
    context?: string;
  };

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const response = AICompanionService.generateResponse(message, context);

  return NextResponse.json({ response });
}