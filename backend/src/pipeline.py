"""Sau khi phien dong: audio tung nguoi -> STT -> transcript -> LLM -> DB.

Moi nguoi co mot file WAV rieng nen khong can tach giong (speaker diarization):
ten nguoi noi da biet truoc tu luc nhan audio.

Nguyen tac: pipeline nay khong duoc phep treo. Du STT hay LLM hong, phien van
phai chuyen sang trang thai "ready" de side panel thoi quay va hien ly do.
"""

from __future__ import annotations

import logging
import os
import wave
from datetime import datetime
from typing import Optional

import numpy as np

from . import db
from .config import AUDIO_DIR, SRC_VOICE

log = logging.getLogger(__name__)

SAMPLE_RATE = 16000
FRAME_SEC = 0.1
VAD_THRESHOLD = float(os.getenv("VAD_THRESHOLD", "0.01"))
VAD_MIN_MS = float(os.getenv("VAD_MIN_MS", "500"))
VAD_SILENCE_MS = float(os.getenv("VAD_SILENCE_MS", "600"))
VAD_MAX_MS = float(os.getenv("VAD_MAX_MS", "20000"))

_asr = None
_asr_failed = False
_llm = None
_llm_failed = False


# ------------------------------------------------------------------ engines
def get_asr():
    """Khoi tao Gipformer mot lan duy nhat (tai model kha nang, co the lau)."""
    global _asr, _asr_failed
    if _asr is not None or _asr_failed:
        return _asr

    try:
        from .STT.asr_engine import GipformerASRGPU

        _asr = GipformerASRGPU(
            # Phai la None chu khong phai "" khi khong co token: huggingface_hub
            # dung "" thanh header "Bearer " va bi tu choi.
            hf_token=os.getenv("HF_TOKEN") or None,
            version=os.getenv("ASR_VERSION", "1.5"),
            quantize=os.getenv("ASR_QUANTIZE", "fp32"),
            provider=os.getenv("ASR_PROVIDER", "cuda"),
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("Khong khoi tao duoc ASR: %s", exc)
        _asr_failed = True
    return _asr


def get_llm():
    global _llm, _llm_failed
    if _llm is not None or _llm_failed:
        return _llm

    try:
        from .LLM_Wrapper.llm_wrapper import LLMWrapper

        _llm = LLMWrapper()
    except Exception as exc:  # noqa: BLE001
        log.exception("Khong khoi tao duoc LLM: %s", exc)
        _llm_failed = True
    return _llm


# ------------------------------------------------------------------- audio
def read_wav(path) -> tuple[np.ndarray, int]:
    """Doc WAV bang thu vien chuan, khong phu thuoc soundfile."""
    with wave.open(str(path), "rb") as handle:
        frames = handle.readframes(handle.getnframes())
        rate = handle.getframerate()
        channels = handle.getnchannels()

    data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    return data, rate


def split_speech(samples: np.ndarray) -> list[tuple[float, float, np.ndarray]]:
    """Cat audio thanh tung doan co tieng noi, tra ve (bat dau, ket thuc, mau).

    Dung nguong nang luong don gian: audio hop da duoc tach rieng tung nguoi
    nen khong can model VAD, chi can bo cac khoang lang.
    """
    frame = int(SAMPLE_RATE * FRAME_SEC)
    segments: list[tuple[float, float, np.ndarray]] = []

    buffer: list[np.ndarray] = []
    speaking = False
    start = 0.0
    silence = 0.0
    speech = 0.0

    for offset in range(0, len(samples) - frame + 1, frame):
        chunk = samples[offset : offset + frame]
        rms = float(np.sqrt(np.mean(np.square(chunk))))
        loud = rms > VAD_THRESHOLD
        clock = offset / SAMPLE_RATE

        if not speaking:
            if not loud:
                continue
            speaking = True
            start = clock
            buffer = []
            silence = 0.0
            speech = 0.0

        buffer.append(chunk)
        if loud:
            speech += FRAME_SEC
        else:
            silence += FRAME_SEC

        too_long = len(buffer) * FRAME_SEC * 1000 >= VAD_MAX_MS
        ended = silence * 1000 >= VAD_SILENCE_MS
        if ended or too_long:
            if speech * 1000 >= VAD_MIN_MS:
                segments.append(
                    (start, start + len(buffer) * FRAME_SEC, np.concatenate(buffer))
                )
            speaking = False
            buffer = []

    if speaking and buffer and speech * 1000 >= VAD_MIN_MS:
        segments.append((start, start + len(buffer) * FRAME_SEC, np.concatenate(buffer)))

    return segments


def _iso_to_ms(iso: str) -> float:
    try:
        return datetime.fromisoformat(iso).timestamp() * 1000
    except ValueError:
        return 0.0


# ---------------------------------------------------------------- pipeline
def process_session(session_id: str) -> None:
    """Chay toan bo pipeline cho mot phien da dong."""
    session = db.get_session(session_id)
    if session is None:
        log.warning("Khong tim thay phien %s", session_id)
        return

    started_ms = _iso_to_ms(session.created_at)
    participants = db.get_participants(session_id)
    asr = get_asr()
    notes: list[str] = []

    if asr is None:
        notes.append("STT chưa sẵn sàng (không khởi tạo được Gipformer — xem log server).")
    else:
        for participant in participants:
            wav_path = AUDIO_DIR / session_id / f"{participant.user_id}.wav"
            if not wav_path.exists():
                continue
            try:
                samples, rate = read_wav(wav_path)
                if rate != SAMPLE_RATE:
                    # Audio tu extension luon la 16 kHz; file khac thi bo qua.
                    notes.append(f"Bỏ qua {participant.user_id}: tần số {rate} Hz.")
                    continue

                # File WAV cua nguoi vao muon bat dau tre hon luc tao phong,
                # nen phai cong offset luc nhan frame dau tien.
                offset_ms = getattr(participant, "start_offset_ms", 0.0) or 0.0

                for start, _end, chunk in split_speech(samples):
                    text = asr.transcribe(chunk, sample_rate=SAMPLE_RATE)
                    if not text:
                        continue
                    db.add_transcript_entry(
                        session_id=session_id,
                        user_id=participant.user_id,
                        user_name=participant.user_name or participant.user_id,
                        timestamp_ms=started_ms + offset_ms + start * 1000,
                        text=text,
                        source=SRC_VOICE,
                    )
            except Exception as exc:  # noqa: BLE001
                log.exception("Loi STT cho %s: %s", participant.user_id, exc)
                notes.append(f"Lỗi phiên âm {participant.user_name or participant.user_id}: {exc}")

    entries = db.get_transcript(session_id)

    llm = get_llm()
    summary = ""
    decisions: list[str] = []
    tasks: list[dict] = []

    if llm is None:
        notes.append("LLM chưa sẵn sàng (kiểm tra LLM_BASE_URL / LLM_API_KEY / LLM_MODEL).")
    else:
        try:
            analysis = llm.analyze_meeting(entries, meeting_time_iso=session.created_at)
            summary = analysis.summary
            decisions = analysis.decisions
            tasks = [task.model_dump() for task in analysis.tasks]
        except Exception as exc:  # noqa: BLE001
            log.exception("Loi LLM cho phien %s: %s", session_id, exc)
            notes.append(f"Lỗi tổng hợp: {exc}")

    if notes:
        summary = (summary + "\n\n" if summary else "") + "\n".join(f"⚠️ {n}" for n in notes)

    # save_summary_and_tasks cung dat trang thai sang READY.
    db.save_summary_and_tasks(session_id, summary or "Không có nội dung.", decisions, tasks)
