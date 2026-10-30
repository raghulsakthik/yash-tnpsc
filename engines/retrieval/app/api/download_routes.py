from fastapi import APIRouter, Query
from app.engine.download.service import DownloadService
router=APIRouter(prefix='/downloads',tags=['downloads'])
service=DownloadService()
@router.get('/disk')
async def disk(): return {'free_bytes':service.downloader.free_bytes()}
@router.post('/probe')
async def probe(url:str=Query(...), filename:str|None=None):
    r=await service.fetch(url,filename); return r.__dict__
