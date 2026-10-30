import json
from typing import Any
from .database import Database

VALID_RESOURCE_STATES={"discovered","queued","downloading","validating","complete","duplicate","quarantined","failed","blocked"}
ALLOWED_TRANSITIONS={
"discovered":{"queued","blocked","failed"}, "queued":{"downloading","blocked","failed"},
"downloading":{"validating","failed","queued","quarantined"}, "validating":{"complete","duplicate","quarantined","failed"},
"failed":{"queued","blocked"}, "complete":set(), "duplicate":set(), "quarantined":{"queued","blocked"}, "blocked":{"queued"}
}
class Repository:
    def __init__(self, db:Database): self.db=db
    def upsert_source(self,name,base_url,source_type):
        with self.db.connection() as c:
            c.execute("INSERT INTO sources(name,base_url,source_type) VALUES(?,?,?) ON CONFLICT(base_url) DO UPDATE SET name=excluded.name,source_type=excluded.source_type",(name,base_url,source_type))
            return c.execute("SELECT * FROM sources WHERE base_url=?",(base_url,)).fetchone()
    def upsert_resource(self, **data):
        with self.db.connection() as c:
            c.execute("INSERT INTO resources(canonical_url,title,source_id,exam,group_name,subject,resource_type,metadata_json) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(canonical_url) DO UPDATE SET title=excluded.title,source_id=excluded.source_id,exam=excluded.exam,group_name=excluded.group_name,subject=excluded.subject,resource_type=excluded.resource_type,metadata_json=excluded.metadata_json,updated_at=CURRENT_TIMESTAMP",(data["canonical_url"],data["title"],data.get("source_id"),data.get("exam"),data.get("group_name"),data.get("subject"),data.get("resource_type"),json.dumps(data.get("metadata",{}))))
            return c.execute("SELECT * FROM resources WHERE canonical_url=?",(data["canonical_url"],)).fetchone()
    def transition_resource(self,resource_id,new_state):
        if new_state not in VALID_RESOURCE_STATES: raise ValueError(f"invalid state: {new_state}")
        with self.db.connection() as c:
            row=c.execute("SELECT status FROM resources WHERE id=?",(resource_id,)).fetchone()
            if not row: raise KeyError(resource_id)
            old=row[0]
            if new_state not in ALLOWED_TRANSITIONS.get(old,set()): raise ValueError(f"invalid transition {old} -> {new_state}")
            c.execute("UPDATE resources SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",(new_state,resource_id))
    def update_resource_result(self,resource_id,*,local_path=None,mime_type=None,actual_size=None,sha256=None):
        with self.db.connection() as c:
            c.execute("UPDATE resources SET local_path=COALESCE(?,local_path),mime_type=COALESCE(?,mime_type),actual_size=COALESCE(?,actual_size),sha256=COALESCE(?,sha256),updated_at=CURRENT_TIMESTAMP WHERE id=?",(local_path,mime_type,actual_size,sha256,resource_id))
    def record_download(self,resource_id,**data):
        with self.db.connection() as c:
            cur=c.execute("INSERT INTO downloads(resource_id,temp_path,final_path,bytes_downloaded,total_bytes,etag,last_modified,attempts,status,started_at,completed_at,error) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",(resource_id,data.get('temp_path'),data.get('final_path'),data.get('bytes_downloaded',0),data.get('total_bytes'),data.get('etag'),data.get('last_modified'),data.get('attempts',1),data.get('status','pending'),data.get('started_at'),data.get('completed_at'),data.get('error')))
            return cur.lastrowid
    def record_event(self,level,event_type,message,resource_id=None,job_id=None,metadata=None):
        with self.db.connection() as c:
            c.execute("INSERT INTO events(level,event_type,resource_id,job_id,message,metadata_json) VALUES(?,?,?,?,?,?)",(level,event_type,resource_id,job_id,message,json.dumps(metadata or {})))
    def record_failure(self,stage,message,resource_id=None,job_id=None,error_type=None,retryable=True,attempt=1):
        with self.db.connection() as c:
            c.execute("INSERT INTO failures(resource_id,job_id,stage,error_type,message,retryable,attempt) VALUES(?,?,?,?,?,?,?)",(resource_id,job_id,stage,error_type,message,int(retryable),attempt))
