from fastapi import APIRouter, Query
from app.engine.observability import Observability
router=APIRouter(prefix='/observability',tags=['observability'])
obs=Observability()
@router.get('/summary')
async def summary(): return obs.summary()
@router.get('/events')
async def events(limit:int=Query(100,ge=1,le=500)): return obs.events(limit)
@router.get('/failures')
async def failures(limit:int=Query(100,ge=1,le=500)): return obs.failures(limit)
@router.get('/jobs/{job_id}')
async def job(job_id:int):
    with obs.db.connection() as c:
        row=c.execute('SELECT * FROM jobs WHERE id=?',(job_id,)).fetchone()
        if not row: return {'status':'not_found','job_id':job_id}
        resources=c.execute('SELECT r.* FROM resources r JOIN job_resources jr ON jr.resource_id=r.id WHERE jr.job_id=?',(job_id,)).fetchall()
    return {'job':dict(row),'resources':[dict(r) for r in resources]}
