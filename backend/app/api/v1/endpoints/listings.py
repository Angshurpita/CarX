from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.listing import ListingModel
from backend.app.schemas.listing import ListingSearchResult, NormalizedListing
from backend.app.services.repository import ListingRepository

router = APIRouter()


@router.get("/cars/meta", response_model=Dict[str, Any])
def get_cars_metadata(db: Session = Depends(get_db)):
    """Retrieve unique vehicle makes, models, body styles, and cities for UI filters."""
    return ListingRepository.get_metadata_facets(db)


@router.get("/cars/search", response_model=ListingSearchResult)
def search_cars(
    make: Optional[str] = Query(None, description="Vehicle make (e.g. Maruti Suzuki, Hyundai)"),
    model: Optional[str] = Query(None, description="Vehicle model (e.g. Swift, Creta, City)"),
    city: Optional[str] = Query(None, description="Target city (e.g. Mumbai, Delhi, Bengaluru)"),
    fuel_type: Optional[str] = Query(None, description="Fuel type (Petrol, Diesel, CNG, Electric)"),
    transmission: Optional[str] = Query(None, description="Transmission (Manual, Automatic)"),
    body_style: Optional[str] = Query(None, description="Body style (Hatchback, Sedan, SUV, MUV, Luxury)"),
    year_min: Optional[int] = Query(None, ge=1995, le=2026),
    year_max: Optional[int] = Query(None, ge=1995, le=2026),
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    max_odometer: Optional[int] = Query(None, ge=0),
    max_owners: Optional[int] = Query(None, ge=1, le=8),
    seller_type: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("date_desc", description="date_desc | price_asc | price_desc | year_desc | km_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search and filter used car listings with pagination."""
    return ListingRepository.search(
        db=db,
        make=make,
        model=model,
        city=city,
        fuel_type=fuel_type,
        transmission=transmission,
        body_style=body_style,
        year_min=year_min,
        year_max=year_max,
        price_min=price_min,
        price_max=price_max,
        max_odometer=max_odometer,
        max_owners=max_owners,
        seller_type=seller_type,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )


@router.get("/listings/{listing_id}", response_model=Dict[str, Any])
def get_listing_detail(listing_id: str, db: Session = Depends(get_db)):
    """Retrieve single listing detail, price history, and provenance metadata."""
    listing = db.query(ListingModel).filter(ListingModel.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail=f"Listing '{listing_id}' not found")

    schema = ListingRepository.model_to_schema(listing)
    
    price_history = [
        {"price": h.price, "observed_at": h.observed_at.isoformat()}
        for h in listing.price_history
    ]

    return {
        "listing": schema.model_dump(),
        "price_history": price_history,
        "provenance": {
            "provider_name": listing.provider_name,
            "source_listing_id": listing.source_listing_id,
            "source_url": listing.source_url,
            "first_observed_at": listing.first_observed_at.isoformat() if listing.first_observed_at else None,
            "last_observed_at": listing.last_observed_at.isoformat() if listing.last_observed_at else None,
            "is_demo": listing.is_demo,
        },
    }
