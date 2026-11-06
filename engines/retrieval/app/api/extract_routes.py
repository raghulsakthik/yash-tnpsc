from fastapi import APIRouter, HTTPException, Query
from app.engine.extract.service import ExtractionService
from app.engine.integrity.path_resolver import resolve_resource_path

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

@router.get('/resource/{resource_id}/preview')
async def preview_resource(resource_id: int, max_pages: int = Query(12, ge=1, le=30)):
    """Read-only MCQ candidate preview. Does not insert into the engine DB."""
    with service.db.connection() as connection:
        row = connection.execute(
            'SELECT id,title,local_path,actual_size,status FROM resources WHERE id=?',
            (resource_id,),
        ).fetchone()
    if not row or row['status'] != 'complete':
        raise HTTPException(404, 'Completed resource was not found')
    path = resolve_resource_path(row['local_path'], row['actual_size'])
    if path is None:
        raise HTTPException(404, 'Resource file is missing or its size does not match the database record')

    candidates = service.extractor.extract_file(str(path), max_pages=max_pages)
    answerless = sum(1 for item in candidates if not item.get('answer'))
    public_candidates = []
    for item in candidates[:100]:
        options = [
            {'label': label.upper(), 'text': item.get('option_' + label)}
            for label in 'abcde'
            if item.get('option_' + label)
        ]
        public_candidates.append({
            'question_number': item.get('question_number'),
            'source_page': item.get('source_page'),
            'question': item.get('question'),
            'options': options,
            'answer_marker': item.get('answer'),
            'answer_marker_present': bool(item.get('answer')),
            'needs_review': True,
        })

    return {
        'resource_id': resource_id,
        'filename': path.name,
        'pages_requested': max_pages,
        'candidate_count': len(candidates),
        'returned_count': len(public_candidates),
        'answerless_count': answerless,
        'truncated': len(candidates) > len(public_candidates),
        'candidates': public_candidates,
        'persisted': False,
        'review_required': True,
        'published': False,
    }
