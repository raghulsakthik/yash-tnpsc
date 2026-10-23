import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth.mjs';
import { getExamReadiness } from '../../../../services/examReadinessService.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code:'UNAUTHENTICATED', message:'Login required' }, { status:401 });
  try { return NextResponse.json(await getExamReadiness(user.id)); }
  catch (err) { return NextResponse.json({ code:'READINESS_FAILED', message:err.message }, { status:500 }); }
}
