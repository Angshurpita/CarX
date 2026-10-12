"""Database Repository for CarX Listings, Search, and Filtering."""
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.listing import (
    ListingModel,
    ListingPriceHistoryModel,
    ProviderModel,
)
from backend.app.schemas.listing import (
    BodyStyle,
    FuelType,
    ListingSearchResult,
    ListingStatus,
    NormalizedListing,
    SellerType,
    Transmission,
)
from backend.app.services.ingestion import SampleDataProvider
from backend.app.services.normalization import normalize_listing_record


class ListingRepository:
    """SQLAlchemy Repository handling search, retrieval, and seeding."""

    @staticmethod
    def model_to_schema(model: ListingModel) -> NormalizedListing:
        return NormalizedListing(
            id=model.id,
            provider_name=model.provider_name,
            source_listing_id=model.source_listing_id,
            source_url=model.source_url,
            make=model.make,
            model=model.model,
            variant=model.variant,
            year=model.year,
            asking_price=model.asking_price,
            currency=model.currency,
            odometer_km=model.odometer_km,
            fuel_type=FuelType(model.fuel_type) if model.fuel_type in [e.value for e in FuelType] else FuelType.PETROL,
            transmission=Transmission(model.transmission) if model.transmission in [e.value for e in Transmission] else Transmission.MANUAL,
            body_style=BodyStyle(model.body_style) if model.body_style in [e.value for e in BodyStyle] else BodyStyle.SUV,
            owners_count=model.owners_count,
            city=model.city,
            state=model.state,
            seller_type=SellerType(model.seller_type) if model.seller_type in [e.value for e in SellerType] else SellerType.DEALER,
            listing_status=ListingStatus(model.listing_status) if model.listing_status in [e.value for e in ListingStatus] else ListingStatus.ACTIVE,
            is_demo=model.is_demo,
            match_confidence=model.match_confidence,
            first_observed_at=model.first_observed_at,
            last_observed_at=model.last_observed_at,
            raw_payload=model.raw_payload or {},
        )

    @classmethod
    def get_by_id(cls, db: Session, listing_id: str) -> Optional[NormalizedListing]:
        rec = db.query(ListingModel).filter(ListingModel.id == listing_id).first()
        if not rec:
            return None
        return cls.model_to_schema(rec)

    @classmethod
    def upsert_listing(cls, db: Session, listing: NormalizedListing) -> ListingModel:
        listing_id = listing.id or f"{listing.provider_name}_{listing.source_listing_id}"
        existing = db.query(ListingModel).filter(ListingModel.id == listing_id).first()

        now = datetime.now(timezone.utc)
        if existing:
            existing.last_observed_at = now
            # Detect price change
            if abs(existing.asking_price - listing.asking_price) > 1.0:
                # Add price history entry
                history_entry = ListingPriceHistoryModel(
                    listing_id=existing.id,
                    price=listing.asking_price,
                    observed_at=now,
                )
                db.add(history_entry)
                existing.asking_price = listing.asking_price
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_model = ListingModel(
                id=listing_id,
                provider_name=listing.provider_name,
                source_listing_id=listing.source_listing_id,
                source_url=listing.source_url,
                make=listing.make,
                model=listing.model,
                variant=listing.variant,
                year=listing.year,
                asking_price=listing.asking_price,
                currency=listing.currency,
                odometer_km=listing.odometer_km,
                fuel_type=listing.fuel_type.value,
                transmission=listing.transmission.value,
                body_style=listing.body_style.value,
                owners_count=listing.owners_count,
                city=listing.city,
                state=listing.state,
                seller_type=listing.seller_type.value,
                listing_status=listing.listing_status.value,
                is_demo=listing.is_demo,
                match_confidence=listing.match_confidence,
                first_observed_at=listing.first_observed_at,
                last_observed_at=listing.last_observed_at,
                raw_payload=listing.raw_payload,
            )
            db.add(new_model)
            db.commit()
            db.refresh(new_model)

            # Record initial price in history
            hist = ListingPriceHistoryModel(
                listing_id=new_model.id,
                price=new_model.asking_price,
                observed_at=new_model.first_observed_at,
            )
            db.add(hist)
            db.commit()
            return new_model

    @classmethod
    def search(
        cls,
        db: Session,
        make: Optional[str] = None,
        model: Optional[str] = None,
        city: Optional[str] = None,
        fuel_type: Optional[str] = None,
        transmission: Optional[str] = None,
        body_style: Optional[str] = None,
        year_min: Optional[int] = None,
        year_max: Optional[int] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        max_odometer: Optional[int] = None,
        max_owners: Optional[int] = None,
        seller_type: Optional[str] = None,
        sort_by: Optional[str] = "date_desc",
        page: int = 1,
        page_size: int = 20,
    ) -> ListingSearchResult:
        query = db.query(ListingModel).filter(ListingModel.listing_status == "active")

        if make:
            query = query.filter(func.lower(ListingModel.make) == make.strip().lower())
        if model:
            query = query.filter(func.lower(ListingModel.model) == model.strip().lower())
        if city:
            query = query.filter(func.lower(ListingModel.city) == city.strip().lower())
        if fuel_type:
            query = query.filter(func.lower(ListingModel.fuel_type) == fuel_type.strip().lower())
        if transmission:
            query = query.filter(func.lower(ListingModel.transmission) == transmission.strip().lower())
        if body_style:
            query = query.filter(func.lower(ListingModel.body_style) == body_style.strip().lower())
        if year_min:
            query = query.filter(ListingModel.year >= year_min)
        if year_max:
            query = query.filter(ListingModel.year <= year_max)
        if price_min:
            query = query.filter(ListingModel.asking_price >= price_min)
        if price_max:
            query = query.filter(ListingModel.asking_price <= price_max)
        if max_odometer:
            query = query.filter(ListingModel.odometer_km <= max_odometer)
        if max_owners:
            query = query.filter(ListingModel.owners_count <= max_owners)
        if seller_type:
            query = query.filter(func.lower(ListingModel.seller_type) == seller_type.strip().lower())

        # Sorting
        if sort_by == "price_asc":
            query = query.order_by(ListingModel.asking_price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(ListingModel.asking_price.desc())
        elif sort_by == "year_desc":
            query = query.order_by(ListingModel.year.desc())
        elif sort_by == "km_asc":
            query = query.order_by(ListingModel.odometer_km.asc())
        else:  # default date_desc
            query = query.order_by(ListingModel.last_observed_at.desc())

        total = query.count()
        total_pages = max(1, math.ceil(total / page_size))
        offset = (page - 1) * page_size
        results = query.offset(offset).limit(page_size).all()

        items = [cls.model_to_schema(r) for r in results]
        return ListingSearchResult(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_metadata_facets(cls, db: Session) -> Dict[str, Any]:
        """Aggregate unique makes, models, body styles, and cities for frontend filters."""
        makes = [m[0] for m in db.query(ListingModel.make).distinct().order_by(ListingModel.make).all() if m[0]]
        cities = [c[0] for c in db.query(ListingModel.city).distinct().order_by(ListingModel.city).all() if c[0]]
        body_styles = [b[0] for b in db.query(ListingModel.body_style).distinct().order_by(ListingModel.body_style).all() if b[0]]
        fuel_types = [f[0] for f in db.query(ListingModel.fuel_type).distinct().order_by(ListingModel.fuel_type).all() if f[0]]
        transmissions = [t[0] for t in db.query(ListingModel.transmission).distinct().order_by(ListingModel.transmission).all() if t[0]]

        min_price = db.query(func.min(ListingModel.asking_price)).scalar() or 100000.0
        max_price = db.query(func.max(ListingModel.asking_price)).scalar() or 5000000.0
        min_year = db.query(func.min(ListingModel.year)).scalar() or 2015
        max_year = db.query(func.max(ListingModel.year)).scalar() or 2024

        return {
            "makes": makes,
            "cities": cities,
            "body_styles": body_styles,
            "fuel_types": fuel_types,
            "transmissions": transmissions,
            "price_range": {"min": min_price, "max": max_price},
            "year_range": {"min": min_year, "max": max_year},
        }

    @classmethod
    def seed_sample_data_if_empty(cls, db: Session, sample_path: str = "data/sample/listings_sample.json"):
        """Populate database from sample dataset if table is currently empty."""
        count = db.query(ListingModel).count()
        if count == 0:
            provider = SampleDataProvider(sample_path)
            raw_records = provider.fetch_raw_listings()
            for record in raw_records:
                normalized = normalize_listing_record(record)
                cls.upsert_listing(db, normalized)
            db.commit()
