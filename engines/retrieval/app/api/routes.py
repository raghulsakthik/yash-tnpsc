from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.config.settings import BASE_URL, DB_PATH
from app.db.database import Database

router=APIRouter()

def db(): return Database(DB_PATH)

@router.get('/status')
def status():
    with db().connection() as c:
        resources=c.execute('SELECT status,COUNT(*) n FROM resources GROUP BY status').fetchall()
        jobs=c.execute('SELECT status,COUNT(*) n FROM jobs GROUP BY status').fetchall()
    return {'service':'tnpsc-material-engine','portal':BASE_URL,'resources':{r['status']:r['n'] for r in resources},'jobs':{r['status']:r['n'] for r in jobs}}

@router.get('/resources')
def resources(status:str|None=None, limit:int=50):
    limit=max(1,min(limit,500))
    with db().connection() as c:
        if status:
            rows=c.execute('SELECT * FROM resources WHERE status=? ORDER BY id DESC LIMIT ?', (status,limit)).fetchall()
        else:
            rows=c.execute('SELECT * FROM resources ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
    return [dict(r) for r in rows]


@router.get('/resources/{resource_id}/file')
def resource_file(resource_id: int):
    with db().connection() as c:
        row = c.execute('SELECT id,title,local_path,status,mime_type FROM resources WHERE id=?', (resource_id,)).fetchone()
    if not row or row['status'] != 'complete' or not row['local_path']:
        raise HTTPException(status_code=404, detail='Resource is not available for analysis')
    from pathlib import Path
    path = Path(row['local_path'])
    if not path.is_absolute(): path = (Path(DB_PATH).parent / path).resolve()
    if not path.exists() or not path.is_file(): raise HTTPException(status_code=404, detail='Downloaded resource file is missing')
    return FileResponse(path, media_type=row['mime_type'] or 'application/octet-stream', filename=path.name)
