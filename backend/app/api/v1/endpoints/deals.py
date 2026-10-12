from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.deals import (
    DealCompareRequest,
    DealCompareResponse,
    DealSearchRequest,
)
from backend.app.services.deals import DealDiscoveryService

router = APIRouter()


@router.post("/deals/compare", response_model=DealCompareResponse)
def compare_cross_city_deals(
    payload: DealCompareRequest,
    db: Session = Depends(get_db),
):
    """Compare equivalent vehicles across Indian cities with itemized cross-city purchase costs."""
    return DealDiscoveryService.compare_cross_city(db=db, req=payload)


@router.post("/deals/search", response_model=DealCompareResponse)
def search_top_deals(
    payload: DealSearchRequest,
    db: Session = Depends(get_db),
):
    """Discover ranked attractive deals across the inventory catalog."""
    return DealDiscoveryService.search_deals(db=db, req=payload)
