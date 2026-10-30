from fastapi import APIRouter, HTTPException
from app.engine.extract.service import ExtractionService

router=APIRouter(prefix='/extract',tags=['extraction'])
service=ExtractionService()

@router.post('/resource/{resource_id}')
async def extract_resource(resource_id:int):
    result=service.extract_resource(resource_id)
    if result.get('status')=='skipped': raise HTTPException(404,result.get('reason'))
    return result

@router.get('/stats')
async def extraction_stats():
    return service.stats()
