from datetime import datetime, timezone
from typing import Optional
import json
import uuid

from sqlmodel import Field, Session, SQLModel, create_engine, select

from .config import (
    DATABASE_URL,
    DB_PATH,
    ROLE_PARTICIPANT,
    SRC_VOICE,
    STATUS_ACTIVE,
    STATUS_READY,
)

if DATABASE_URL.startswith("sqlite"):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(DATABASE_URL, echo=False)

class MeetingSession(SQLModel, table=True):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    meet_code: Optional[str] = Field(default=None, index=True)
    title: Optional[str] = None # Được AI tạo sau khi xong cuộc họp
    host_name: str
    host_token: str
    status: str = Field(default=STATUS_ACTIVE)
    summary: Optional[str] = None
    decisions_json: str = Field(default="[]")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TranscriptEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="meetingsession.session_id", index=True)
    user_id: str # if google auth thi luu id google vao dau tot hon va tao bang user han hoi
    user_name: Optional[str] = None
    timestamp_ms: float
    text: str
    source: str = Field(default=SRC_VOICE)

class TaskEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="meetingsession.session_id", index=True)
    task_description: str
    assignee: Optional[str] = None
    due_date_iso: Optional[str] = None
    priority: str = Field(default="medium")  # "low" | "medium" | "high"
    status: str = Field(default="draft")     # "draft" | "confirmed" | "synced"

class SessionParticipant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="meetingsession.session_id", index=True)
    user_id: str
    # Can de ghi ten nguoi noi vao transcript sau khi phien ket thuc, luc do
    # ket noi WebSocket da dong va khong con biet ten nua.
    user_name: Optional[str] = None
    # Thoi diem (ms, tinh tu luc tao phong) nhan duoc frame audio dau tien.
    # Nguoi vao muon thi file WAV cua ho bat dau tre hon; neu khong cong offset
    # nay, moi cau cua ho se bi danh dau som hon thuc te.
    start_offset_ms: float = Field(default=0.0)
    role: str = Field(default=ROLE_PARTICIPANT)

def init_db() -> None:
    """Create all SQLite tables if they don't exist yet."""
    SQLModel.metadata.create_all(engine)


def create_session(
    host_name: str,
    host_token: str,
    meet_code: Optional[str] = None,
) -> MeetingSession:
    """Insert a new active MeetingSession and return it."""
    session = MeetingSession(
        meet_code=meet_code,
        host_name=host_name,
        host_token=host_token,
    )
    
    with Session(engine) as db:
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def get_active_session_by_code(meet_code: str) -> Optional[MeetingSession]:
    """Find the currently active session for a given Google Meet code."""
    query = select(MeetingSession).where(
        MeetingSession.meet_code == meet_code,
        MeetingSession.status == STATUS_ACTIVE,
    )
    
    with Session(engine) as db:
        return db.exec(query).first() 

def get_session(session_id: str) -> Optional[MeetingSession]:
    query = select(MeetingSession).where(
            MeetingSession.session_id == session_id,
    )
    
    with Session(engine) as db:
        return db.exec(query).first()


def update_session_status(session_id: str, new_status: str) -> Optional[MeetingSession]:
    
    with Session(engine) as db:
        session = db.get(MeetingSession, session_id)
        if not session:
            return None
        
        session.status = new_status 
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

def add_transcript_entry(
    session_id: str,
    user_id: str,
    user_name: str,
    timestamp_ms: float,
    text: str,
    source: str
) -> TranscriptEntry:
    """Save one transcribed utterance into transcriptentry."""
    transcript_row = TranscriptEntry(
        session_id=session_id,
        user_id=user_id,
        user_name=user_name,
        timestamp_ms=timestamp_ms,
        text=text,
        source=source
    )
    
    with Session(engine) as db:
        db.add(transcript_row)
        db.commit()
        db.refresh(transcript_row)
        return transcript_row

def get_transcript(session_id: str) -> list[TranscriptEntry]:
    """Return all transcript entries for a session, sorted by timestamp_ms."""
    query = select(TranscriptEntry).where(
            TranscriptEntry.session_id == session_id
        ).order_by(
            TranscriptEntry.timestamp_ms
        )
        
    with Session(engine) as db:
        return db.exec(query).all()


def save_summary_and_tasks(
    session_id: str,
    summary: str,
    decisions: list[str],
    tasks: list[dict],
) -> None:
    """Save LLM output (summary, decisions, and draft tasks) for a session."""
    with Session(engine) as db:
        session = db.get(MeetingSession, session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.summary = summary
        session.decisions_json = json.dumps(decisions, ensure_ascii=False)
        session.status = STATUS_READY
        
        for task in tasks:
            db.add(TaskEntry(
                session_id=session_id,
                task_description=task["task_description"],
                assignee=task["assignee"],
                due_date_iso=task.get("due_date_iso"),
                priority=task.get("priority", "medium"),
            ))
        
        db.commit()

def get_tasks(session_id: str) -> list[TaskEntry]:
    """Return all tasks for a given session."""
    query = select(TaskEntry).where(
                TaskEntry.session_id == session_id
            ).order_by(
                TaskEntry.id
            )
    with Session(engine) as db:
        return db.exec(query).all()


def get_session(session_id: str) -> Optional[MeetingSession]:
    with Session(engine) as db:
        return db.get(MeetingSession, session_id)


def get_latest_session_by_code(meet_code: str) -> Optional[MeetingSession]:
    """Phien moi nhat cua mot ma Meet, bat ke trang thai.

    Dung cho cac endpoint doc ket qua: nguoi dung mo lai side panel sau khi
    phien da dong van phai xem duoc bien ban.
    """
    query = (
        select(MeetingSession)
        .where(MeetingSession.meet_code == meet_code)
        .order_by(MeetingSession.created_at.desc())
    )
    with Session(engine) as db:
        return db.exec(query).first()


def upsert_participant(
    session_id: str,
    user_id: str,
    user_name: Optional[str] = None,
    role: str = ROLE_PARTICIPANT,
) -> SessionParticipant:
    """Ghi nhan mot nguoi tham gia; goi lai thi cap nhat ten/vai tro."""
    query = select(SessionParticipant).where(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == user_id,
    )
    with Session(engine) as db:
        row = db.exec(query).first()
        if row is not None:
            if user_name:
                row.user_name = user_name
            if role:
                row.role = role
        else:
            row = SessionParticipant(
                session_id=session_id, user_id=user_id, user_name=user_name, role=role
            )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row


def get_participants(session_id: str) -> list[SessionParticipant]:
    query = select(SessionParticipant).where(SessionParticipant.session_id == session_id)
    with Session(engine) as db:
        return db.exec(query).all()


def set_participant_start_offset(
    session_id: str, user_id: str, offset_ms: float
) -> None:
    """Ghi thoi diem nhan frame audio dau tien cua mot nguoi.

    Goi mot lan khi frame dau tien den; cac frame sau khong dung toi DB.
    """
    query = select(SessionParticipant).where(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == user_id,
    )
    with Session(engine) as db:
        row = db.exec(query).first()
        if row is not None:
            row.start_offset_ms = offset_ms
            db.add(row)
            db.commit()


def get_task(task_id: int) -> Optional[TaskEntry]:
    with Session(engine) as db:
        return db.get(TaskEntry, task_id)


def update_task(task_id: int, **fields) -> Optional[TaskEntry]:
    """Cap nhat mot task; cho phep gan None cho cac truong nullable."""
    with Session(engine) as db:
        task = db.get(TaskEntry, task_id)
        if task is None:
            return None
        for key, value in fields.items():
            if hasattr(task, key):
                setattr(task, key, value)
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
