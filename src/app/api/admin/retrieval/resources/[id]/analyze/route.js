import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../../../lib/permissions.mjs';
import { createProcessingBatch } from '../../../../../../../lib/contentProcessing.mjs';
export const dynamic='force-dynamic'; export const maxDuration=300;
const retrievalUrl=process.env.RETRIEVAL_ENGINE_URL||'http://127.0.0.1:8000'; const MAX_FILE_BYTES=25*1024*1024;
export async function POST(request,{params}){
 const admin=await requirePermission(request,PERMISSIONS.CONTENT_CREATE); if(!admin)return NextResponse.json({code:'FORBIDDEN',message:'Admin access required'},{status:403});
 const id=Number((await params).id); if(!Number.isInteger(id)||id<1)return NextResponse.json({code:'BAD_RESOURCE_ID',message:'Invalid retrieval resource id'},{status:400});
 try{const list=await fetch(`${retrievalUrl}/api/resources?limit=500`,{cache:'no-store'});if(!list.ok)throw new Error(`Retrieval engine returned ${list.status}`);const rows=await list.json();const r=rows.find(x=>Number(x.id)===id);if(!r)return NextResponse.json({code:'NOT_FOUND',message:'Retrieval resource not found'},{status:404});if(r.status!=='complete'||r.resource_type==='question_paper')return NextResponse.json({code:'NOT_ANALYSABLE',message:'Only completed non-PYQ retrieval material can enter the label engine.'},{status:400});const file=await fetch(`${retrievalUrl}/api/resources/${id}/file`,{cache:'no-store'});if(!file.ok)throw new Error(`Could not fetch retrieved file (${file.status})`);const data=Buffer.from(await file.arrayBuffer());if(!data.length)throw new Error('Retrieved file is empty');if(data.length>MAX_FILE_BYTES)throw new Error('Retrieved file is larger than 25 MB');// documentExtract.mjs picks its parser purely off the filename extension
// (mimeType is accepted but never consulted) -- r.title has no extension
// at all ("Panchayati Raj — Overview"), which made every retrieval-sourced
// analysis fail with UNSUPPORTED_FORMAT regardless of mime_type. The
// engine's own local_path always keeps the real downloaded extension
// (see DownloadService._final_dir in engines/retrieval), so borrow that.
const realExt=String(r.local_path||'').split('.').pop();
const titlePart=String(r.title||`retrieval-${id}`).split('/').pop().replace(/[\\/:*?"<>|]/g,'_');
const fileName=realExt&&realExt.length<=5&&!titlePart.toLowerCase().endsWith(`.${realExt.toLowerCase()}`)?`${titlePart}.${realExt}`:titlePart;const batchId=await createProcessingBatch({adminId:admin.accountId,files:[{fileName,mimeType:r.mime_type||'application/pdf',sourceYear:null,examCode:'TNPSC',examGroup:r.group_name||'TNPSC_GROUP_2/2A',paper:r.title,data}]});return NextResponse.json({batchId,resourceId:id,title:r.title});}catch(e){return NextResponse.json({code:'RETRIEVAL_ANALYSIS_FAILED',message:e.message},{status:502});}
}
