from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.listing import ListingModel, ListingPriceHistoryModel, SavedSearchModel
from backend.app.schemas.saved_search import PriceDropAlert, SavedSearchCreate, SavedSearchResponse

router = APIRouter()


@router.post("/saved-searches", response_model=SavedSearchResponse)
def create_saved_search(payload: SavedSearchCreate, db: Session = Depends(get_db)):
    """Save a search criteria with a price-drop alert threshold."""
    search_record = SavedSearchModel(
        user_email=payload.user_email,
        query_params=payload.query_params,
        target_price_drop_pct=payload.target_price_drop_pct,
    )
    db.add(search_record)
    db.commit()
    db.refresh(search_record)
    return SavedSearchResponse(
        id=search_record.id,
        user_email=search_record.user_email,
        query_params=search_record.query_params,
        target_price_drop_pct=search_record.target_price_drop_pct,
        created_at=search_record.created_at,
    )


@router.get("/saved-searches", response_model=List[SavedSearchResponse])
def list_saved_searches(email: str = None, db: Session = Depends(get_db)):
    """Retrieve saved searches, optionally filtered by user email."""
    query = db.query(SavedSearchModel)
    if email:
        query = query.filter(SavedSearchModel.user_email == email)
    searches = query.order_by(SavedSearchModel.created_at.desc()).all()
    return [
        SavedSearchResponse(
            id=s.id,
            user_email=s.user_email,
            query_params=s.query_params,
            target_price_drop_pct=s.target_price_drop_pct,
            created_at=s.created_at,
        )
        for s in searches
    ]


@router.get("/saved-searches/alerts", response_model=List[PriceDropAlert])
def detect_price_drop_alerts(min_drop_pct: float = 3.0, db: Session = Depends(get_db)):
    """Find all active listings that experienced a price drop based on recorded price history."""
    alerts: List[PriceDropAlert] = []
    listings = db.query(ListingModel).all()

    for l in listings:
        if len(l.price_history) >= 2:
            # Sort history chronologically
            sorted_history = sorted(l.price_history, key=lambda h: h.observed_at)
            initial_price = sorted_history[0].price
            current_price = l.asking_price
            if current_price < initial_price:
                drop_amount = initial_price - current_price
                drop_pct = round((drop_amount / initial_price) * 100, 2)
                if drop_pct >= min_drop_pct:
                    alerts.append(
                        PriceDropAlert(
                            listing_id=l.id,
                            make=l.make,
                            model=l.model,
                            variant=l.variant,
                            city=l.city,
                            current_price=current_price,
                            previous_price=initial_price,
                            drop_amount=drop_amount,
                            drop_pct=drop_pct,
                            observed_at=l.last_observed_at,
                        )
                    )
    return alerts
