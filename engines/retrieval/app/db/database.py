import sqlite3
from pathlib import Path
from contextlib import contextmanager

class Database:
    def __init__(self, path: Path):
        self.path=Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
    @contextmanager
    def connection(self):
        conn=sqlite3.connect(self.path, timeout=30)
        conn.row_factory=sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    def initialize(self):
        schema=(Path(__file__).with_name("schema.sql")).read_text()
        with self.connection() as conn:
            conn.executescript(schema)
