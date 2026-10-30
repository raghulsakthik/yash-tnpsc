from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = PROJECT_ROOT / "data" / "tnpsc-material"
DB_PATH = PROJECT_ROOT / "data" / "engine.sqlite3"
BROWSER_PROFILE = DATA_ROOT / "browser-profile"
BASE_URL = "https://tamilnaducareerservices.tn.gov.in/Vle_candidate/vle_home"
TARGET_EXAMS = {"TNPSC_GROUP_2", "TNPSC_GROUP_2A"}
BROWSER_HEADLESS = os.getenv("TNPSC_BROWSER_HEADLESS", "0") == "1"
BROWSER_LOGIN_TIMEOUT = int(os.getenv("TNPSC_BROWSER_LOGIN_TIMEOUT", "300"))
BROWSER_EXECUTABLE = os.getenv("TNPSC_BROWSER_EXECUTABLE", "/usr/bin/google-chrome")
