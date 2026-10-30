from fastapi import APIRouter, Query
from app.engine.browser.service import service as browser_service
from app.engine.discovery.portal import PortalDiscovery
from app.engine.classification.resource import ResourceClassifier
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

@router.post('/tnpsc-catalog')
async def tnpsc_catalog(max_courses: int = Query(100, ge=1, le=100)):
    """Catalog Group II/IIA course chapters without downloading files or changing study progress."""
    page = await browser_service.manager.open_portal(timeout=10000)
    try:
        if not await browser_service.manager.session_looks_authenticated(page):
            return {'authenticated': False, 'courses': [], 'resources': 0}
        await page.goto('https://tamilnaducareerservices.tn.gov.in/Vle_candidate/vle_candidate_cousrelist/all', wait_until='commit', timeout=10000)
        await page.wait_for_timeout(700)
        # Filter the course list to TNPSC Group II/IIA.
        try:
            await page.locator('#vle_course_filter2').select_option('2')
            await page.locator('#course_list_filter_sub').click()
            await page.wait_for_timeout(1200)
        except Exception:
            pass
        seen = {}
        # Collect current and paginated result links. The portal uses offsets in the search endpoint.
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
                title=item['title'] or 'TNPSC Group II/IIA course'
                href=item['href']
                if ('vle_course_single/' in href and href not in seen and ('ii' in title.lower() or '2' in title.lower() or 'tnpsc' in title.lower())):
                    seen[href]={'url':href,'title':title}
            if len(seen) >= max_courses: break
        courses=list(seen.values())[:max_courses]
        db=Database(DB_PATH); repo=Repository(db); src=repo.upsert_source('Tamil Nadu Career Services VLE','https://tamilnaducareerservices.tn.gov.in','official_portal')
        resource_count=0; chapter_failures=0
        for c in courses:
            course_id=c['url'].rstrip('/').split('/')[-1]
            chapter_url=f'https://tamilnaducareerservices.tn.gov.in/vle_candidate/vle_course_study_chapters/{course_id}/0'
            try:
                await page.goto(chapter_url, wait_until='commit', timeout=8000)
                await page.wait_for_timeout(400)
                buttons=await page.locator('[onclick*="savestudychapter"]').evaluate_all("els => els.map(e => ({onclick:e.getAttribute('onclick'),text:(e.innerText||e.textContent||'').trim()}))")
                for b in buttons:
                    import re, json as _json
                    m=re.search(r"savestudychapter\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]", b['onclick'] or '')
                    if not m: continue
                    chapter_id=m.group(1)
                    pdf=f'https://tamilnaducareerservices.tn.gov.in/asset/docs/course_pdf/{chapter_id}.pdf'
                    # Catalog the deterministic PDF URL without a network HEAD request.
                    # The downloader will validate reachability, MIME type, size and integrity.
                    title=(b['text'] or f'Course {course_id} chapter {chapter_id}').strip()
                    hay=f"{c.get('title','')} {title}".lower()
                    group_name='TNPSC_GROUP_2A' if ('group iia' in hay or 'group 2a' in hay or 'group ii a' in hay) else 'TNPSC_GROUP_2'
                    meta={'course_id':course_id,'course_url':c['url'],'course_title':c.get('title',''),'chapter_id':chapter_id,'chapter_url':chapter_url,'catalog_only':True}
                    repo.upsert_resource(canonical_url=pdf,title=title,source_id=src['id'],exam='TNPSC',group_name=group_name,resource_type='study_material',metadata=meta)
                    resource_count += 1
            except Exception:
                chapter_failures += 1
        return {'authenticated':True,'courses':len(courses),'resources':resource_count,'chapter_failures':chapter_failures}
    finally:
        await page.close()
