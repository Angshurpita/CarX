from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.ai.assistant import AssistantService
from backend.app.db.session import get_db
from backend.app.schemas.assistant import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/assistant/chat", response_model=ChatResponse)
async def chat_with_assistant(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    """Conversational CarX AI Assistant grounded in backend tools."""
    return await AssistantService.chat(payload, db)


@router.post("/assistant/stream")
async def stream_chat_with_assistant(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    """Stream assistant response in real-time via Server-Sent Events (SSE)."""
    return StreamingResponse(
        AssistantService.stream_chat(payload, db),
        media_type="text/event-stream",
    )
