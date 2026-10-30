from app.config.settings import DB_PATH
from app.db.database import Database
Database(DB_PATH).initialize()
print(DB_PATH)
