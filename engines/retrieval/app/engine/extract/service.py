from __future__ import annotations
import json
from pathlib import Path
from app.config.settings import DB_PATH
from app.db import Database, Repository
from .mcq import MCQExtractor

class ExtractionService:
    def __init__(self):
        self.db=Database(DB_PATH); self.db.initialize()
        self.repo=Repository(self.db); self.extractor=MCQExtractor()

    def extract_resource(self, resource_id: int) -> dict:
        with self.db.connection() as c:
            row=c.execute('SELECT * FROM resources WHERE id=?',(resource_id,)).fetchone()
        if not row or not row['local_path']:
            return {'status':'skipped','reason':'resource-not-found-or-no-local-file','count':0}
        questions=self.extractor.extract_file(row['local_path'])
        # Fingerprints are calculated from the canonical MCQ fields below.
        clean=[]; seen=set()
        from .mcq import MCQ
        for q in questions:
            obj=MCQ(**q); fp=obj.fingerprint
            if fp not in seen: seen.add(fp); clean.append((obj,fp))
        inserted=0
        with self.db.connection() as c:
            for obj,fp in clean:
                cur=c.execute('INSERT OR IGNORE INTO questions(resource_id,question,option_a,option_b,option_c,option_d,answer,explanation,fingerprint,source_page) VALUES(?,?,?,?,?,?,?,?,?,?)',(resource_id,obj.question,obj.option_a,obj.option_b,obj.option_c,obj.option_d,obj.answer,obj.explanation,fp,obj.source_page))
                inserted += cur.rowcount
            c.execute('UPDATE resources SET metadata_json=json_set(metadata_json,\'$.extracted_mcq_count\',?),updated_at=CURRENT_TIMESTAMP WHERE id=?',(len(clean),resource_id))
        return {'status':'complete','resource_id':resource_id,'count':len(clean),'inserted':inserted}

    def stats(self) -> dict:
        with self.db.connection() as c:
            total=c.execute('SELECT COUNT(*) FROM questions').fetchone()[0]
            resources=c.execute('SELECT COUNT(DISTINCT resource_id) FROM questions').fetchone()[0]
        return {'questions':total,'resources':resources}
