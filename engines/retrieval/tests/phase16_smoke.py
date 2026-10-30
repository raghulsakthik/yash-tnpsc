from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.config.settings import DATA_ROOT, DB_PATH
from app.db.database import Database
from app.engine.download.manager import ResumableDownloader, DiskSafetyError

assert DATA_ROOT.exists()
Database(DB_PATH).initialize()
d = ResumableDownloader(DATA_ROOT)
free = d.free_bytes()
assert free > 0
print('DATA_ROOT_OK', DATA_ROOT)
print('DB_OK', DB_PATH)
print('DISK_FREE_BYTES', free)
try:
    d.ensure_space(free + 1)
except DiskSafetyError:
    print('DISK_GUARD_OK')
else:
    raise AssertionError('disk guard failed')
print('PHASE16_SMOKE_OK')
