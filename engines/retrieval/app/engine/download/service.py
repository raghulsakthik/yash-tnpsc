from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime, timezone
from app.config.settings import DATA_ROOT, DB_PATH
from app.db import Database, Repository
from app.engine.integrity.validator import validate_file
from app.engine.integrity.dedup import register_or_find_duplicate
from .manager import ResumableDownloader, DownloadResult
from app.engine.recovery.manager import RecoveryManager

class DownloadService:
    def __init__(self):
        self.downloader=ResumableDownloader(DATA_ROOT)
        self.repo=Repository(Database(DB_PATH))
        self.repo.db.initialize()
        self.recovery = RecoveryManager(concurrency=2, rate_limit_rps=1.0)

    @staticmethod
    def _safe_name(name: str) -> str:
        name=''.join(c if c.isalnum() or c in ' ._-()[]' else '_' for c in name).strip(' .')
        return (name or 'download')[:180]

    def _final_dir(self, metadata: dict | None) -> Path:
        m=metadata or {}
        group=(m.get('group_name') or '').upper()
        typ=(m.get('resource_type') or '').lower()
        if '2A' in group: group_dir='group-2a'
        elif '2' in group: group_dir='group-2'
        else: group_dir='unclassified'
        if typ == 'question_paper': bucket='question-papers'
        elif typ == 'mock_test': bucket='mock-tests'
        elif typ == 'mcq': bucket='mcq'
        elif typ == 'syllabus': bucket='syllabus'
        else: bucket='study-material'
        return DATA_ROOT/'official'/'tn-career-services'/group_dir/bucket

    async def fetch(self,url:str,filename:str|None=None,expected_size:int|None=None,metadata:dict|None=None,resource_id:int|None=None)->DownloadResult:
        name=self._safe_name(filename or Path(urlparse(url).path).name or 'download')
        quarantine=DATA_ROOT/'quarantine'
        quarantine.mkdir(parents=True,exist_ok=True)
        temp_target=quarantine/name
        if resource_id:
            with self.repo.db.connection() as c:
                row=c.execute('SELECT status FROM resources WHERE id=?',(resource_id,)).fetchone()
            if row:
                state=row['status']
                if state == 'discovered':
                    self.repo.transition_resource(resource_id,'queued')
                    state='queued'
                if state == 'queued':
                    self.repo.transition_resource(resource_id,'downloading')
        async def operation():
            return await self.downloader.download(url,temp_target,expected_size)
        result, retry_info = await self.recovery.run(operation, url)
        if result is None:
            result = DownloadResult("failed", url, None, temp_target.stat().st_size if temp_target.exists() else 0, expected_size, None, retry_info.error)
        if result.status != 'complete':
            if resource_id:
                self.repo.record_download(resource_id,temp_path=str(temp_target)+'.part',bytes_downloaded=result.bytes_downloaded,total_bytes=result.total_bytes,status=result.status,error=result.error,attempts=retry_info.attempts)
                self.repo.record_failure('download',result.error or 'download-failed',resource_id=resource_id,retryable=result.status!='blocked')
            return result
        if resource_id:
            try: self.repo.transition_resource(resource_id,'validating')
            except ValueError: pass
        validation=validate_file(result.path,expected_size)
        if not validation.ok:
            bad=quarantine/(name+'.invalid')
            Path(result.path).replace(bad)
            if resource_id:
                try: self.repo.transition_resource(resource_id,'quarantined')
                except ValueError: pass
                self.repo.record_failure('validation',validation.reason or 'invalid-file',resource_id=resource_id,retryable=False)
                self.repo.record_download(resource_id,temp_path=str(temp_target),bytes_downloaded=result.bytes_downloaded,total_bytes=result.total_bytes,status='quarantined',error=validation.reason,attempts=retry_info.attempts)
            return DownloadResult('quarantined',url,str(bad),result.bytes_downloaded,result.total_bytes,result.sha256,validation.reason)
        digest,duplicate_id=(register_or_find_duplicate(self.repo,resource_id,result.path) if resource_id else (result.sha256,None))
        if duplicate_id:
            Path(result.path).unlink(missing_ok=True)
            if resource_id:
                try: self.repo.transition_resource(resource_id,'duplicate')
                except ValueError: pass
                self.repo.update_resource_result(resource_id,sha256=digest,actual_size=validation.size,mime_type=validation.mime_type)
            return DownloadResult('duplicate',url,None,validation.size,result.total_bytes,digest,f'duplicate-of-resource-{duplicate_id}')
        final_dir=self._final_dir(metadata)
        final_dir.mkdir(parents=True,exist_ok=True)
        final=final_dir/name
        if final.exists():
            stem,suffix=final.stem,final.suffix
            final=final_dir/f'{stem}-{digest[:12]}{suffix}'
        Path(result.path).replace(final)
        if resource_id:
            self.repo.update_resource_result(resource_id,local_path=str(final),mime_type=validation.mime_type,actual_size=validation.size,sha256=digest)
            try: self.repo.transition_resource(resource_id,'complete')
            except ValueError: pass
            self.repo.record_download(resource_id,temp_path=str(temp_target),final_path=str(final),bytes_downloaded=validation.size,total_bytes=result.total_bytes,status='complete',completed_at=datetime.now(timezone.utc).isoformat(),attempts=retry_info.attempts)
            self.repo.record_event('info','download.finalized',f'Finalized {final}',resource_id=resource_id,metadata={'sha256':digest,'mime_type':validation.mime_type})
        return DownloadResult('complete',url,str(final),validation.size,result.total_bytes,digest)
