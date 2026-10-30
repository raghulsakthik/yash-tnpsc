import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
export const dynamic = 'force-dynamic';
const retrievalUrl = process.env.RETRIEVAL_ENGINE_URL || 'http://127.0.0.1:8000';
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code:'FORBIDDEN', message:'Admin access required' }, {status:403});
  const {searchParams}=new URL(request.url); const group=searchParams.get('group')||''; const limit=Math.min(200,Math.max(1,Number(searchParams.get('limit')||100)));
  try { const res=await fetch(`${retrievalUrl}/api/resources?status=complete&limit=${limit}`,{cache:'no-store'}); if(!res.ok) throw new Error(`Retrieval engine returned ${res.status}`); const rows=await res.json(); const resources=rows.filter(r=>{const g=String(r.group_name||'').toUpperCase(); return !group || (group==='GROUP_2A' ? (g.includes('GROUP_2A') || g.includes('GROUP_2/2A')) : (g.includes('GROUP_2') && !g.includes('GROUP_2A') && g!=='TNPSC_GROUP_2/2A'));}).filter(r=>r.resource_type!=='question_paper'); return NextResponse.json({resources}); }
  catch(e){return NextResponse.json({code:'RETRIEVAL_UNAVAILABLE',message:e.message},{status:502});}
}
