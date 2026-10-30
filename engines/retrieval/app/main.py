from fastapi import FastAPI
from app.config.settings import BASE_URL, DB_PATH
from app.db.database import Database
from app.api.routes import router
from app.api.browser_routes import router as browser_router
from app.api.auth_routes import router as auth_router
from app.api.discovery_routes import router as discovery_router
from app.api.download_routes import router as download_router
from app.api.extract_routes import router as extract_router
from app.api.recovery_routes import router as recovery_router
from app.api.public_routes import router as public_router
from app.api.observability_routes import router as observability_router

app=FastAPI(title='TNPSC Material Engine',version='0.3.0')
Database(DB_PATH).initialize()
app.include_router(router,prefix='/api')
app.include_router(browser_router,prefix='/api')
app.include_router(auth_router,prefix='/api')
app.include_router(discovery_router,prefix='/api')
app.include_router(download_router,prefix='/api')
app.include_router(extract_router,prefix='/api')
app.include_router(recovery_router,prefix='/api')
app.include_router(public_router,prefix='/api')
app.include_router(observability_router,prefix='/api')

@app.get('/health')
def health():
    return {'status':'ok','service':'tnpsc-material-engine','portal':BASE_URL,'database':str(DB_PATH)}
