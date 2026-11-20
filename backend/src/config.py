from pathlib import Path
from dotenv import load_dotenv
import os

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"
DB_PATH = BACKEND_DIR / "database" / "meeting.db"
# Noi luu audio tam cua tung nguoi, moi phien mot thu muc con.
AUDIO_DIR = BACKEND_DIR / "data" / "audio"
# Load backend/.env once for all modules
load_dotenv(ENV_PATH)
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DB_PATH}"
MAX_RESPONSE_TOKEN = int(os.getenv("MAX_RESPONSE_TOKEN") or 4096)

# Meeting session statuses
STATUS_ACTIVE = "active"
STATUS_PROCESSING = "processing"
STATUS_READY = "ready"
STATUS_CLOSED = "closed"

# Transcript entry sources
SRC_VOICE = "voice"
SRC_CHAT = "chat"

# Participant roles
ROLE_PARTICIPANT = "participant"
ROLE_HOST = "host"

# Task priorities & statuses
PRIORITY_LOW = "low"
PRIORITY_MEDIUM = "medium"
PRIORITY_HIGH = "high"

TASK_STATUS_DRAFT = "draft"
TASK_STATUS_CONFIRMED = "confirmed"
TASK_STATUS_SYNCED = "synced"
