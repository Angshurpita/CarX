from fastapi import APIRouter, Depends
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
