from __future__ import annotations
import json
from datetime import datetime, timezone
from app.config.settings import DB_PATH
from app.db import Database

class Observability:
    def __init__(self):
        self.db=Database(DB_PATH); self.db.initialize()
    def _conn(self): return self.db.connection()
    def create_job(self, job_type:str, metadata:dict|None=None)->int:
        with self._conn() as c:
            cur=c.execute("INSERT INTO jobs(job_type,status,metadata_json) VALUES(?,?,?)",(job_type,'queued',json.dumps(metadata or {})))
            return int(cur.lastrowid)
    def update_job(self, job_id:int, status:str, error:str|None=None):
        with self._conn() as c:
            if status=='running': c.execute("UPDATE jobs SET status=?,started_at=COALESCE(started_at,CURRENT_TIMESTAMP),error=? WHERE id=?",(status,error,job_id))
            elif status in {'complete','failed','cancelled'}: c.execute("UPDATE jobs SET status=?,finished_at=CURRENT_TIMESTAMP,error=? WHERE id=?",(status,error,job_id))
            else: c.execute("UPDATE jobs SET status=?,error=? WHERE id=?",(status,error,job_id))
    def attach_resource(self,job_id:int,resource_id:int):
        with self._conn() as c: c.execute("INSERT OR IGNORE INTO job_resources(job_id,resource_id) VALUES(?,?)",(job_id,resource_id))
    def event(self,level,event_type,message,resource_id=None,job_id=None,metadata=None):
        with self._conn() as c: c.execute("INSERT INTO events(level,event_type,resource_id,job_id,message,metadata_json) VALUES(?,?,?,?,?,?)",(level,event_type,resource_id,job_id,message,json.dumps(metadata or {})))
    def summary(self)->dict:
        with self._conn() as c:
            resources={r['status']:r['n'] for r in c.execute('SELECT status,COUNT(*) n FROM resources GROUP BY status')}
            jobs={r['status']:r['n'] for r in c.execute('SELECT status,COUNT(*) n FROM jobs GROUP BY status')}
            downloads={r['status']:r['n'] for r in c.execute('SELECT status,COUNT(*) n FROM downloads GROUP BY status')}
            failures={r['stage']:r['n'] for r in c.execute('SELECT stage,COUNT(*) n FROM failures GROUP BY stage')}
            total_bytes=c.execute('SELECT COALESCE(SUM(actual_size),0) FROM resources WHERE actual_size IS NOT NULL').fetchone()[0]
            questions=c.execute('SELECT COUNT(*) FROM questions').fetchone()[0]
        return {'resources':resources,'jobs':jobs,'downloads':downloads,'failures_by_stage':failures,'stored_bytes':int(total_bytes),'questions':int(questions),'generated_at':datetime.now(timezone.utc).isoformat()}
    def events(self,limit:int=100):
        limit=max(1,min(limit,500))
        with self._conn() as c: rows=c.execute('SELECT * FROM events ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
        return [dict(r) for r in rows]
    def failures(self,limit:int=100):
        limit=max(1,min(limit,500))
        with self._conn() as c: rows=c.execute('SELECT * FROM failures ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
        return [dict(r) for r in rows]
