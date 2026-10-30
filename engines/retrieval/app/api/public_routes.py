from fastapi import APIRouter, Query
from app.engine.discovery.public_web import PublicWebConnector
router=APIRouter(prefix='/public',tags=['public-web'])
connector=PublicWebConnector()
@router.get('/search')
async def search(q:str=Query(...,min_length=3),limit:int=Query(20,ge=1,le=50)):
    return {'query':q,'results':await connector.search(q,limit)}
