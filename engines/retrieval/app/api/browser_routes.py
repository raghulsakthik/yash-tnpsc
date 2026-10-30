from fastapi import APIRouter
from app.engine.browser.service import BrowserService

router = APIRouter(prefix="/browser", tags=["browser"])
service = BrowserService()


@router.get("/status")
async def browser_status():
    return await service.status()


@router.post("/login")
async def browser_login():
    authenticated = await service.login()
    return {"authenticated": authenticated, "profile_path": str(service.manager.profile_path)}


@router.post("/check-login")
async def browser_check_login():
    return {"authenticated": await service.check_login()}
