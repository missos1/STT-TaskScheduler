import json
import os
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from openai import OpenAI
from pydantic import BaseModel

from .. import config  # loads backend/.env on import
from ..db import TranscriptEntry

VN_TZ = timezone(timedelta(hours=7))

class ExtractedTask(BaseModel):
    task_description: str
    assignee: str
    due_date_iso: Optional[str] = None
    priority: Literal["low", "medium", "high"] = "medium"


class MeetingAnalysis(BaseModel):
    summary: str
    decisions: list[str]
    tasks: list[ExtractedTask]


def _format_transcript(entries: list[TranscriptEntry]) -> str:
    """Format DB transcript rows into readable chronological dialogue lines."""
    lines = []
    for e in entries:
        # JS Date.now() is in milliseconds; Python fromtimestamp() expects seconds
        clock = datetime.fromtimestamp(e.timestamp_ms / 1000, tz=VN_TZ).strftime("%H:%M:%S")
        lines.append(f"[{clock}] {e.user_name} ({e.source}): {e.text}")
    return "\n".join(lines)


def _clean_json_response(raw_text: str) -> str:
    """Extract the JSON object in case the model wraps output in markdown fences."""
    text = raw_text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start : end + 1]
    return text


def _build_system_prompt(meeting_time_iso: str) -> str:
    """Build the system prompt with real-time anchor and strict JSON schema."""
    dt = datetime.fromisoformat(meeting_time_iso)
    day_of_week = dt.strftime("%A")
    schema_json = json.dumps(MeetingAnalysis.model_json_schema(), indent=2)

    return (
        "You are an AI meeting assistant. Analyze the meeting transcript below.\n"
        f"Current meeting time (anchor): {meeting_time_iso} ({day_of_week}).\n\n"
        "Rules:\n"
        "1. Write `summary`, `decisions`, and `task_description` in the same language as the meeting.\n"
        "2. Write a thorough, detailed `summary` (structured with clean bullet points using `\\n` when helpful) "
        "covering the main topics discussed, key points or concerns raised by each speaker, and the context behind each decision.\n"
        "3. Convert relative deadlines (e.g., 'chiều mai', 'thứ Sáu tuần này', 'next Monday') "
        "into ISO-8601 strings using the meeting time anchor above. "
        "If no deadline is mentioned for a task, set `due_date_iso` to null.\n"
        "4. Only extract concrete, actionable tasks with an `assignee` from the participants.\n"
        "5. Respond with ONLY a valid JSON object matching this exact schema (no markdown, no extra text):\n"
        f"{schema_json}"
    )


class LLMWrapper:
    def __init__(
        self,
        model_base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.client = OpenAI(
            base_url=model_base_url or os.getenv("LLM_BASE_URL"),
            api_key=api_key or os.getenv("LLM_API_KEY"),
            # Khong co timeout thi mot request treo se giu pipeline vo han va
            # side panel quay mai. Loi 503 cung se duoc thu lai ngan gon.
            timeout=float(os.getenv("LLM_TIMEOUT_SEC") or 60),
            max_retries=int(os.getenv("LLM_MAX_RETRIES") or 1),
        )
        self.model = model or os.getenv("LLM_MODEL")

    def analyze_meeting(
        self,
        entries: list[TranscriptEntry],
        meeting_time_iso: Optional[str] = None,
    ) -> MeetingAnalysis:
        """Summarize a meeting transcript and extract structured tasks."""
        if not entries:
            return MeetingAnalysis(
                summary="Cuộc họp chưa có nội dung.",
                decisions=[],
                tasks=[],
            )

        anchor_time = meeting_time_iso or datetime.now(VN_TZ).isoformat()
        transcript_text = _format_transcript(entries)
        system_prompt = _build_system_prompt(anchor_time)

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript_text},
            ],
            temperature=0.1,
            max_tokens=config.MAX_RESPONSE_TOKEN,
            stream=False,
        )

        raw_text = completion.choices[0].message.content or ""
        return MeetingAnalysis.model_validate_json(_clean_json_response(raw_text))


if __name__ == "__main__":
    # Quick standalone test: python -m backend.src.LLM_Wrapper.llm_wrapper
    now_ms = datetime.now(VN_TZ).timestamp() * 1000
    sample_entries = [
        TranscriptEntry(
            session_id="test",
            user_id="u1",
            user_name="Alice",
            timestamp_ms=now_ms,
            text="Hôm nay mình chốt dùng FastAPI và SQLite cho bản demo nhé.",
            source="voice",
        ),
        TranscriptEntry(
            session_id="test",
            user_id="u2",
            user_name="Minh Anh",
            timestamp_ms=now_ms + 5000,
            text="Ok, chiều mai trước 5 giờ mình sẽ gửi bản thiết kế UI lên Figma.",
            source="voice",
        ),
        TranscriptEntry(
            session_id="test",
            user_id="u1",
            user_name="Alice",
            timestamp_ms=now_ms + 9000,
            text="Còn Hùng lo giúp mình phần kết nối WebSocket trước thứ Sáu tuần này nha.",
            source="chat",
        ),
    ]

    wrapper = LLMWrapper()
    result = wrapper.analyze_meeting(sample_entries)
    print(result.model_dump_json(indent=2))

