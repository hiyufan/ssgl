"""Pitch-coach (模拟答辩) router."""

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.services.coach_service import coach_service, SessionExpiredError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["coach"])


class StartRequest(BaseModel):
    role: str = "student"
    source: str  # "pre_plan" | "text"
    pre_plan_id: Optional[int] = None
    pitch_text: Optional[str] = None
    num_questions: int = 4


class AnswerRequest(BaseModel):
    session_id: str
    question_id: int
    answer: str


class FinalRequest(BaseModel):
    session_id: str


@router.post("/start")
async def start(body: StartRequest) -> dict:
    if body.source not in ("pre_plan", "text"):
        raise HTTPException(status_code=400, detail="source 必须是 pre_plan 或 text")
    if body.source == "pre_plan" and not body.pre_plan_id:
        raise HTTPException(status_code=400, detail="缺少 pre_plan_id")
    if body.source == "text" and not (body.pitch_text or "").strip():
        raise HTTPException(status_code=400, detail="缺少 pitch_text")

    try:
        return coach_service.start(
            role=body.role,
            source=body.source,
            pre_plan_id=body.pre_plan_id,
            pitch_text=body.pitch_text,
            num_questions=max(3, min(body.num_questions, 6)),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"coach.start failed: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")


@router.post("/answer")
async def answer(body: AnswerRequest):
    # generate() is a SYNC function on purpose: coach_service.answer_stream is a
    # plain sync generator (unlike assistant's async chat_stream). Starlette runs
    # a sync StreamingResponse iterator in a threadpool.
    def generate():
        try:
            for chunk in coach_service.answer_stream(
                session_id=body.session_id,
                question_id=body.question_id,
                answer=body.answer,
            ):
                # Wrap plain string chunks in a dict for consistent SSE format
                if isinstance(chunk, str):
                    payload = {"chunk": chunk}
                else:
                    payload = chunk
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except SessionExpiredError:
            yield "data: [EXPIRED]\n\n"
        except Exception as e:
            logger.error(f"coach.answer stream error: {e}")
            yield "data: [ERROR]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/final")
async def final(body: FinalRequest) -> dict:
    try:
        return coach_service.final(session_id=body.session_id)
    except SessionExpiredError:
        raise HTTPException(status_code=404, detail="答辩会话已过期")
    except Exception as e:
        logger.error(f"coach.final failed: {e}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")
