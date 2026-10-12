from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DealCompareCandidate(BaseModel):
    listing_id: str
    make: str
    model: str
    variant: str
    year: int
    odometer_km: int
    fuel_type: str
    transmission: str
    city: str
    state: str
    asking_price: float
    estimated_fair_price: float
    price_difference: float = Field(..., description="asking_price - estimated_fair_price (negative indicates discount)")
    discount_pct: float
    match_confidence: float
    match_tier: str
    distance_km: int
    transport_cost: float
    inspection_cost: float
    rto_transfer_cost: float
    estimated_total_purchase_cost: float
    deal_score: float = Field(..., ge=0, le=100, description="Comprehensive deal attractiveness score")
    net_benefit_vs_local: Optional[float] = None
    deal_verdict: str = Field(..., description="Summary verdict e.g. Attractive Deal, Fair Price, Premium Priced")
    recommendation_reasons: List[str]
    risk_flags: List[str]
    cost_breakdown: List[Dict[str, Any]]
    source_url: str


class DealCompareRequest(BaseModel):
    buyer_city: str = Field(..., description="Target destination city for buyer (e.g. Mumbai, Bengaluru)")
    make: str = Field(..., description="Vehicle make (e.g. Hyundai, Honda)")
    model: str = Field(..., description="Vehicle model (e.g. Creta, City)")
    variant: Optional[str] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None


class DealCompareResponse(BaseModel):
    buyer_city: str
    total_candidates: int
    best_deal_listing_id: Optional[str] = None
    candidates: List[DealCompareCandidate]
    disclaimer: str = Field(
        "Negative price differences and deal rankings represent statistical model estimates. Inspect all vehicles physically and verify ownership documentation prior to token advance.",
        description="Consumer transparency advisory"
    )


class DealSearchRequest(BaseModel):
    city: Optional[str] = None
    buyer_city: Optional[str] = "Delhi"
    make: Optional[str] = None
    model: Optional[str] = None
    max_budget: Optional[float] = None
    min_discount_pct: Optional[float] = None
    page: int = 1
    page_size: int = 20
