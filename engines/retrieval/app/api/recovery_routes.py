from fastapi import APIRouter
from app.engine.recovery.manager import RecoveryManager

router = APIRouter(prefix='/recovery', tags=['recovery'])

@router.get('/policy')
async def policy():
    r = RecoveryManager()
    return {'max_attempts': r.policy.max_attempts, 'base_delay': r.policy.base_delay, 'max_delay': r.policy.max_delay, 'concurrency': r.semaphore._value, 'rate_limit_rps': 1.0}
