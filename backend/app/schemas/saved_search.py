from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


class SavedSearchCreate(BaseModel):
    user_email: str = Field(..., description="Notification destination email")
    query_params: Dict[str, Any] = Field(..., description="Filters: make, model, city, max_budget, etc.")
    target_price_drop_pct: Optional[float] = Field(5.0, ge=1.0, le=50.0)


class SavedSearchResponse(BaseModel):
    id: int
    user_email: str
    query_params: Dict[str, Any]
    target_price_drop_pct: float
    created_at: datetime


class PriceDropAlert(BaseModel):
    listing_id: str
    make: str
    model: str
    variant: str
    city: str
    current_price: float
    previous_price: float
    drop_amount: float
    drop_pct: float
    observed_at: datetime
