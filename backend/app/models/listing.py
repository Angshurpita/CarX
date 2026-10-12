from datetime import datetime, timezone
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class ProviderModel(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    provider_type = Column(String(50), nullable=False, default="partner_api")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    listings = relationship("ListingModel", back_populates="provider")


class ListingModel(Base):
    __tablename__ = "listings"

    id = Column(String(120), primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)
    provider_name = Column(String(100), nullable=False)
    source_listing_id = Column(String(100), nullable=False, index=True)
    source_url = Column(String(500), nullable=False)

    make = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    variant = Column(String(150), nullable=False, default="Standard")
    year = Column(Integer, nullable=False, index=True)
    asking_price = Column(Float, nullable=False, index=True)
    currency = Column(String(10), default="INR")
    odometer_km = Column(Integer, nullable=False, index=True)
    fuel_type = Column(String(50), nullable=False, index=True)
    transmission = Column(String(50), nullable=False, index=True)
    body_style = Column(String(50), nullable=False, index=True)
    owners_count = Column(Integer, default=1)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    seller_type = Column(String(50), default="dealer")
    listing_status = Column(String(50), default="active", index=True)
    is_demo = Column(Boolean, default=False)
    match_confidence = Column(Float, default=1.0)

    first_observed_at = Column(DateTime(timezone=True), default=utc_now)
    last_observed_at = Column(DateTime(timezone=True), default=utc_now)
    raw_payload = Column(JSON, nullable=True)

    provider = relationship("ProviderModel", back_populates="listings")
    price_history = relationship(
        "ListingPriceHistoryModel",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingPriceHistoryModel.observed_at.desc()",
    )
    valuation_snapshots = relationship(
        "ValuationSnapshotModel",
        back_populates="listing",
        cascade="all, delete-orphan",
    )


class ListingPriceHistoryModel(Base):
    __tablename__ = "listing_price_history"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(String(120), ForeignKey("listings.id"), nullable=False, index=True)
    price = Column(Float, nullable=False)
    observed_at = Column(DateTime(timezone=True), default=utc_now)

    listing = relationship("ListingModel", back_populates="price_history")


class ValuationSnapshotModel(Base):
    __tablename__ = "valuation_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(String(120), ForeignKey("listings.id"), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    estimated_fair_price = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    difference_amount = Column(Float, nullable=False)
    difference_percentage = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    listing = relationship("ListingModel", back_populates="valuation_snapshots")
