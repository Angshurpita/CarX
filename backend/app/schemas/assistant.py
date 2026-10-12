from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    message: ChatMessage
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    model_used: str
    provider_status: str = Field(..., description="'openrouter_live' or 'deterministic_fallback'")
