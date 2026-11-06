from fastapi import APIRouter, Query, HTTPException
from app.engine.browser.service import service as browser_service
from app.engine.discovery.portal import PortalDiscovery
from app.engine.classification.resource import ResourceClassifier
from app.engine.extract.document_text import extract_document_text
from app.engine.extract.review_gate import enforce_extraction_review
from app.engine.integrity.path_resolver import resolve_resource_path
from app.config.settings import DB_PATH
from app.db.database import Database
from app.db.repository import Repository

router = APIRouter(prefix='/discovery', tags=['discovery'])


@router.get('/portal-links')
async def portal_links(max_pages: int = Query(10, ge=1, le=50)):
    page = await browser_service.manager.open_portal(timeout=15000)
    authenticated = await browser_service.manager.session_looks_authenticated(page)
    if not authenticated:
        return {'page_url': page.url, 'authenticated': False, 'count': 0, 'links': []}
    links = await PortalDiscovery().crawl(page, max_pages)
    return {'page_url': page.url, 'authenticated': True, 'count': len(links), 'links': links}


@router.post('/classify')
async def classify(title: str, url: str = '', text: str = ''):
    return ResourceClassifier().classify(title, url, text)


@router.post('/classify-resource/{resource_id}')
async def classify_resource(resource_id: int):
    """Analyze an already-downloaded resource against the canonical course tree.

    This is a preview only: it does not change resource labels or publish
    content. Admin review remains the publication boundary.
    """
    database = Database(DB_PATH)
    with database.connection() as connection:
        row = connection.execute(
            'SELECT id,title,canonical_url,local_path,actual_size,status,metadata_json FROM resources WHERE id=?',
            (resource_id,),
        ).fetchone()

    if not row or row['status'] != 'complete':
        raise HTTPException(status_code=404, detail='Completed resource was not found')

    path = resolve_resource_path(row['local_path'], row['actual_size'])
    if path is None:
        raise HTTPException(status_code=404, detail='Resource file is missing or its size does not match the database')

    classifier = ResourceClassifier()
    title_classification = classifier.classify(row['title'], row['canonical_url'], '')
    extracted = extract_document_text(path, language_hint=title_classification.get('language'))
    classification = classifier.classify(
        row['title'],
        row['canonical_url'],
        extracted.text,
    )
    classification = enforce_extraction_review(classification, extracted)

    return {
        'resource_id': resource_id,
        'filename': path.name,
        'classification': classification,
        'extraction': {
            'method': extracted.method,
            'page_count': extracted.page_count,
            'pages_examined': extracted.pages_examined,
            'text_characters': len(extracted.text),
            'warnings': extracted.warnings,
            'preview': extracted.text[:1200],
        },
        'published': False,
        'review_required': classification['review_required'],
    }


@router.post('/tnpsc-catalog')
async def tnpsc_catalog(max_courses: int = Query(100, ge=1, le=100)):
    """Catalog Group II/IIA course chapters without downloading files or changing study progress."""
    page = await browser_service.manager.open_portal(timeout=10000)
    try:
        if not await browser_service.manager.session_looks_authenticated(page):
            return {'authenticated': False, 'courses': [], 'resources': 0}
        await page.goto('https://tamilnaducareerservices.tn.gov.in/Vle_candidate/vle_candidate_cousrelist/all', wait_until='commit', timeout=10000)
        await page.wait_for_timeout(700)
        try:
            await page.locator('#vle_course_filter2').select_option('2')
            await page.locator('#course_list_filter_sub').click()
            await page.wait_for_timeout(1200)
        except Exception:
            pass
        seen = {}
        for offset in [0] + list(range(12, 120, 12)):
            url = 'https://tamilnaducareerservices.tn.gov.in/Vle_candidate/vle_candidate_cousrelist_search'
            if offset:
                url += f'/{offset}'
            try:
                await page.goto(url, wait_until='commit', timeout=8000)
                await page.wait_for_timeout(500)
            except Exception:
                continue
            links = await page.locator('a[href*="vle_course_single/"]').evaluate_all("els => els.map(a => ({href:a.href,title:(a.innerText||a.textContent||'').trim()}))")
            for item in links:
                title = item['title'] or 'TNPSC Group II/IIA course'
                href = item['href']
                if ('vle_course_single/' in href and href not in seen and ('ii' in title.lower() or '2' in title.lower() or 'tnpsc' in title.lower())):
                    seen[href] = {'url': href, 'title': title}
            if len(seen) >= max_courses:
                break
        courses = list(seen.values())[:max_courses]
        db = Database(DB_PATH)
        repo = Repository(db)
        src = repo.upsert_source('Tamil Nadu Career Services VLE', 'https://tamilnaducareerservices.tn.gov.in', 'official_portal')
        resource_count = 0
        chapter_failures = 0
        for course in courses:
            course_id = course['url'].rstrip('/').split('/')[-1]
            chapter_url = f'https://tamilnaducareerservices.tn.gov.in/vle_candidate/vle_course_study_chapters/{course_id}/0'
            try:
                await page.goto(chapter_url, wait_until='commit', timeout=8000)
                await page.wait_for_timeout(400)
                buttons = await page.locator('[onclick*="savestudychapter"]').evaluate_all("els => els.map(e => ({onclick:e.getAttribute('onclick'),text:(e.innerText||e.textContent||'').trim()}))")
                for button in buttons:
                    import re, json as _json
                    match = re.search(r"savestudychapter\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]", button['onclick'] or '')
                    if not match:
                        continue
                    chapter_id = match.group(1)
                    pdf = f'https://tamilnaducareerservices.tn.gov.in/asset/docs/course_pdf/{chapter_id}.pdf'
                    title = (button['text'] or f'Course {course_id} chapter {chapter_id}').strip()
                    hay = f"{course.get('title', '')} {title}".lower()
                    group_name = 'TNPSC_GROUP_2A' if ('group iia' in hay or 'group 2a' in hay or 'group ii a' in hay) else 'TNPSC_GROUP_2'
                    meta = {'course_id': course_id, 'course_url': course['url'], 'course_title': course.get('title', ''), 'chapter_id': chapter_id, 'chapter_url': chapter_url, 'catalog_only': True}
                    repo.upsert_resource(canonical_url=pdf, title=title, source_id=src['id'], exam='TNPSC', group_name=group_name, resource_type='study_material', metadata=meta)
                    resource_count += 1
            except Exception:
                chapter_failures += 1
        return {'authenticated': True, 'courses': len(courses), 'resources': resource_count, 'chapter_failures': chapter_failures}
    finally:
        await page.close()
