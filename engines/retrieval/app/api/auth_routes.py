from fastapi import APIRouter

from app.config.settings import BROWSER_LOGIN_TIMEOUT
from app.engine.auth.health import inspect_environment
from app.engine.auth.session import SessionAuthenticator
from app.engine.browser.service import service as browser_service

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/status")
async def auth_status():
    result = await SessionAuthenticator(browser_service.manager).check()
    return {**result.__dict__, "environment": inspect_environment().__dict__}


@router.post("/login")
async def auth_login():
    result = await SessionAuthenticator(browser_service.manager).wait_for_user(BROWSER_LOGIN_TIMEOUT)
    return result.__dict__


@router.post("/invalidate")
async def auth_invalidate():
    await SessionAuthenticator(browser_service.manager).invalidate_local_session()
    return {"invalidated": True, "profile_path": str(browser_service.manager.profile_path)}
