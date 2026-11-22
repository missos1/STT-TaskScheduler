"""FastAPI backend cho Meeting Assistant.

Luong chay:
  Extension (mic rieng, PCM 16 kHz) --WS--> WAV rieng tung nguoi
  Host dong phien -> STT + LLM (pipeline.py) -> SQLite
  Side panel -> GET /summary + POST /tasks/confirm

Bam theo api_contract_and_roadmap.md cua nhom.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import secrets
import time
import wave
from datetime import datetime
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import db, pipeline
from .config import (
    AUDIO_DIR,
    STATUS_ACTIVE,
    STATUS_CLOSED,
    STATUS_PROCESSING,
    STATUS_READY,
    TASK_STATUS_CONFIRMED,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("meeting-assistant")

app = FastAPI(title="STT Task Scheduler")

# Side panel cua extension chay o origin chrome-extension:// nen phai mo CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_RATE = 16000
FRAME_HEADER = 8  # float64 timestamp ms, little-endian
CODE_RE = re.compile(r"^[a-z]{3}-[a-z]{4}-[a-z]{3}$")
TASK_ID_RE = re.compile(r"^task_(\d+)$")

# Ket noi dang song theo phien: session_id -> user_id -> _Peer
_peers: Dict[str, Dict[str, "_Peer"]] = {}
# Task nen phai duoc giu tham chieu, neu khong event loop se thu hoi.
_background: set = set()

# Trang thai trong DB -> trang thai ma hop dong tra ve cho GET /check
_CHECK_STATUS = {
    STATUS_ACTIVE: "active",
    STATUS_PROCESSING: "processing",
    STATUS_READY: "closed",
    STATUS_CLOSED: "closed",
}


class _Peer:
    """Mot nguoi dang gui audio: WebSocket + file WAV dang ghi."""

    def __init__(self, session, user_id: str):
        self.session_id = session.session_id
        self.user_id = user_id
        self.ws: Optional[WebSocket] = None
        self._session_epoch = _iso_to_epoch(session.created_at)
        self._first_frame_at: Optional[float] = None

        folder = AUDIO_DIR / self.session_id
        folder.mkdir(parents=True, exist_ok=True)
        self.path = folder / f"{user_id}.wav"
        self._wav = wave.open(str(self.path), "wb")
        self._wav.setnchannels(1)
        self._wav.setsampwidth(2)
        self._wav.setframerate(SAMPLE_RATE)

    def write(self, pcm: bytes) -> None:
        # Frame dau tien danh dau luc nguoi nay bat dau duoc ghi. Phai luu lai:
        # nguoi vao muon co file WAV bat dau tre hon, khong cong offset nay thi
        # moi cau cua ho se bi danh dau som hon thuc te.
        if self._first_frame_at is None:
            self._first_frame_at = time.time()
            db.set_participant_start_offset(
                self.session_id,
                self.user_id,
                max(0.0, (self._first_frame_at - self._session_epoch) * 1000),
            )
        self._wav.writeframes(pcm)

    def close(self) -> None:
        try:
            self._wav.close()
        except Exception:  # noqa: BLE001
            pass


def _spawn(coro) -> None:
    task = asyncio.create_task(coro)
    _background.add(task)
    task.add_done_callback(_background.discard)


# ------------------------------------------------------------------- models
class CreateRoomRequest(BaseModel):
    meet_code: str
    host_name: str


class CloseRoomRequest(BaseModel):
    meet_code: str
    host_token: str


class TaskPayload(BaseModel):
    id: str
    task_description: Optional[str] = None
    assignee: Optional[str] = None
    due_date_iso: Optional[str] = None
    priority: Optional[str] = None


class ConfirmTasksRequest(BaseModel):
    targets: list[str] = []
    tasks: list[TaskPayload]


# ------------------------------------------------------------------ helpers
def _iso_to_epoch(iso: str) -> float:
    try:
        return datetime.fromisoformat(iso).timestamp()
    except (TypeError, ValueError):
        return time.time()


def _require_meet_code(meet_code: str) -> str:
    code = (meet_code or "").strip().lower()
    if not CODE_RE.match(code):
        raise HTTPException(400, "Mã phòng phải có dạng abc-defg-hij")
    return code


def _resolve_session(meet_code: str):
    """Uu tien phien dang hoat dong, khong co thi lay phien moi nhat."""
    return db.get_active_session_by_code(meet_code) or db.get_latest_session_by_code(meet_code)


def _task_id_to_int(task_id: str) -> int:
    match = TASK_ID_RE.match(str(task_id))
    if not match:
        raise HTTPException(400, f"Task id không hợp lệ: {task_id}")
    return int(match.group(1))


def _serialize_task(task) -> dict:
    return {
        # Hop dong dung id dang chuoi "task_01"; DB dung khoa so nguyen.
        "id": f"task_{task.id:02d}",
        "task_description": task.task_description,
        "assignee": task.assignee,
        "due_date_iso": task.due_date_iso,
        "priority": task.priority,
        "status": task.status,
    }


def _serialize_entry(entry) -> dict:
    return {
        "id": f"seg_{entry.id:03d}",
        "user_id": entry.user_id,
        "user_name": entry.user_name,
        "timestamp_ms": entry.timestamp_ms,
        "text": entry.text,
    }


# --------------------------------------------------------------------- API
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "asr": "ready" if pipeline._asr is not None else "chưa khởi tạo",
        "llm": "ready" if pipeline._llm is not None else "chưa khởi tạo",
    }


@app.post("/api/rooms/create", status_code=201)
def create_room(payload: CreateRoomRequest):
    code = _require_meet_code(payload.meet_code)

    if db.get_active_session_by_code(code):
        raise HTTPException(409, "Room is already active")

    session = db.create_session(
        meet_code=code,
        host_name=payload.host_name,
        host_token=secrets.token_urlsafe(16),
    )
    log.info("Tạo phòng %s (session %s)", code, session.session_id)

    return {
        "meet_code": code,
        "session_id": session.session_id,
        "status": STATUS_ACTIVE,
        "host_token": session.host_token,
    }


@app.get("/api/rooms/check/{meet_code}")
def check_room(meet_code: str):
    """Luôn 200 để side panel polling mà không thấy lỗi đỏ trong Console."""
    code = (meet_code or "").strip().lower()
    session = _resolve_session(code)
    if session is None:
        return {"meet_code": code, "active": False, "status": "not_created"}

    return {
        "meet_code": code,
        "active": session.status == STATUS_ACTIVE,
        "status": _CHECK_STATUS.get(session.status, session.status),
    }


@app.post("/api/rooms/close", status_code=200)
async def close_room(payload: CloseRoomRequest):
    code = _require_meet_code(payload.meet_code)
    session = _resolve_session(code)
    if session is None:
        raise HTTPException(404, "Room not found")

    if not payload.host_token or not secrets.compare_digest(
        session.host_token, payload.host_token
    ):
        raise HTTPException(403, "Invalid host token")

    if session.status != STATUS_ACTIVE:
        raise HTTPException(409, "Room is already closed")

    db.update_session_status(session.session_id, STATUS_PROCESSING)
    await _close_peers(session.session_id)
    log.info("Đóng phòng %s, bắt đầu tổng hợp", code)

    # Pipeline chay o thread rieng: model STT/LLM la thu vien dong bo, chay
    # trong event loop se chan toan bo server.
    _spawn(asyncio.to_thread(_run_pipeline, session.session_id))

    return {"meet_code": code, "status": STATUS_PROCESSING}


def _run_pipeline(session_id: str) -> None:
    try:
        pipeline.process_session(session_id)
    except Exception as exc:  # noqa: BLE001
        log.exception("Pipeline loi cho phien %s: %s", session_id, exc)
        db.save_summary_and_tasks(
            session_id, f"Không tổng hợp được biên bản: {exc}", [], []
        )


@app.get("/api/rooms/{meet_code}/transcript")
def get_transcript(meet_code: str):
    code = (meet_code or "").strip().lower()
    session = _resolve_session(code)
    if session is None:
        raise HTTPException(404, "Room not found")

    entries = db.get_transcript(session.session_id)
    return {
        "meet_code": code,
        "status": _CHECK_STATUS.get(session.status, session.status),
        "transcript": [_serialize_entry(entry) for entry in entries],
    }


@app.get("/api/rooms/{meet_code}/summary")
def get_summary(meet_code: str):
    code = (meet_code or "").strip().lower()
    session = _resolve_session(code)
    if session is None:
        raise HTTPException(404, "Room not found")

    if session.status != STATUS_READY:
        # Side panel dua vao status nay de biet con phai hoi tiep hay khong.
        return {
            "meet_code": code,
            "status": STATUS_PROCESSING,
            "summary": None,
            "decisions": [],
            "tasks": [],
        }

    return {
        "meet_code": code,
        "status": STATUS_READY,
        "meeting_time_iso": session.created_at,
        "summary": session.summary or "",
        "decisions": _load_decisions(session.decisions_json),
        "tasks": [_serialize_task(task) for task in db.get_tasks(session.session_id)],
    }


def _load_decisions(raw: str) -> list[str]:
    try:
        value = json.loads(raw or "[]")
        return value if isinstance(value, list) else []
    except ValueError:
        return []


@app.post("/api/rooms/{meet_code}/tasks/confirm")
def confirm_tasks(meet_code: str, payload: ConfirmTasksRequest):
    code = (meet_code or "").strip().lower()
    session = _resolve_session(code)
    if session is None:
        raise HTTPException(404, "Room not found")

    results: list[dict] = []
    confirmed = 0

    for incoming in payload.tasks:
        task_id = _task_id_to_int(incoming.id)
        updated = db.update_task(
            task_id,
            task_description=incoming.task_description,
            assignee=incoming.assignee,
            due_date_iso=incoming.due_date_iso,
            priority=incoming.priority,
            status=TASK_STATUS_CONFIRMED,
        )
        if updated is None:
            results.append({"task_id": incoming.id, "target": None, "status": "not_found"})
            continue

        confirmed += 1
        if not payload.targets:
            results.append({"task_id": incoming.id, "target": None, "status": TASK_STATUS_CONFIRMED})
            continue

        for target in payload.targets:
            # Chua tich hop dich vu ngoai — bao ro la chua cau hinh thay vi
            # tra ve "synced" gia tao.
            results.append(
                {"task_id": incoming.id, "target": target, "status": "not_configured"}
            )

    return {"meet_code": code, "synced_count": confirmed, "results": results}


# ----------------------------------------------------------------- WebSocket
@app.websocket("/ws/meet/{meet_code}")
async def ws_meet(
    websocket: WebSocket,
    meet_code: str,
    user_id: str = Query("", alias="user_id"),
    user_name: str = Query("", alias="user_name"),
):
    code = (meet_code or "").strip().lower()
    user_id = user_id or secrets.token_hex(4)
    user_name = user_name or user_id

    await websocket.accept()

    session = db.get_active_session_by_code(code)
    if session is None:
        await websocket.send_json({"type": "error", "message": "Room is not active"})
        await websocket.close(code=4001)
        return

    db.upsert_participant(session.session_id, user_id, user_name)
    peer = _Peer(session, user_id)
    peer.ws = websocket
    _peers.setdefault(session.session_id, {})[user_id] = peer
    log.info("Nhận audio: %s (%s) vào %s", user_name, user_id, code)

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break

            data = message.get("bytes")
            if data:
                _handle_audio(peer, data)
                continue

            text = message.get("text")
            if not text:
                continue
            try:
                payload = json.loads(text)
            except ValueError:
                continue

            if payload.get("type") == "sync":
                await websocket.send_json(
                    {
                        "type": "sync_ack",
                        "client_time_ms": payload.get("client_time_ms"),
                        "server_time_ms": time.time() * 1000,
                    }
                )
            elif payload.get("type") == "stop":
                break
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.warning("WebSocket loi (%s): %s", user_id, exc)
    finally:
        peer.close()
        bucket = _peers.get(session.session_id, {})
        if bucket.get(user_id) is peer:
            bucket.pop(user_id, None)
        log.info("Ngắt audio: %s", user_name)


def _handle_audio(peer: _Peer, data: bytes) -> None:
    """Khung tin theo hop dong 4.3: 8 byte float64 + Int16 PCM."""
    if len(data) <= FRAME_HEADER:
        return
    # timestamp hien chua dung de can chinh; WAV ghi lien tuc theo thu tu nhan.
    pcm = data[FRAME_HEADER:]
    if pcm:
        peer.write(pcm)


async def _close_peers(session_id: str) -> None:
    for peer in list(_peers.get(session_id, {}).values()):
        try:
            if peer.ws is not None:
                await peer.ws.send_json({"type": "room_closed", "meet_code": session_id})
                await peer.ws.close(code=4000)
        except Exception:  # noqa: BLE001
            pass
        peer.close()
    _peers.pop(session_id, None)


@app.on_event("startup")
def on_startup() -> None:
    db.init_db()
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    log.info("DB sẵn sàng, audio lưu tại %s", AUDIO_DIR)
