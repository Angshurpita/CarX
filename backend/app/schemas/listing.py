from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FuelType(str, Enum):
    PETROL = "Petrol"
    DIESEL = "Diesel"
    CNG = "CNG"
    ELECTRIC = "Electric"
    HYBRID = "Hybrid"


class Transmission(str, Enum):
    MANUAL = "Manual"
    AUTOMATIC = "Automatic"
    AMT = "AMT"
    CVT = "CVT"
    DCT = "DCT"


class BodyStyle(str, Enum):
    HATCHBACK = "Hatchback"
    SEDAN = "Sedan"
    SUV = "SUV"
    MUV = "MUV"
    LUXURY = "Luxury"


class SellerType(str, Enum):
    INDIVIDUAL = "individual"
    DEALER = "dealer"
    CERTIFIED_DEALER = "certified_dealer"


class ListingStatus(str, Enum):
    ACTIVE = "active"
    SOLD = "sold"
    EXPIRED = "expired"
    STALE = "stale"


# Indian City to State mapping for automated normalization
INDIAN_CITY_STATE_MAP = {
    "delhi": ("Delhi", "Delhi"),
    "new delhi": ("Delhi", "Delhi"),
    "delhi ncr": ("Delhi NCR", "Delhi NCR"),
    "mumbai": ("Mumbai", "Maharashtra"),
    "pune": ("Pune", "Maharashtra"),
    "bengaluru": ("Bengaluru", "Karnataka"),
    "bangalore": ("Bengaluru", "Karnataka"),
    "hyderabad": ("Hyderabad", "Telangana"),
    "chennai": ("Chennai", "Tamil Nadu"),
    "kolkata": ("Kolkata", "West Bengal"),
    "ahmedabad": ("Ahmedabad", "Gujarat"),
    "surat": ("Surat", "Gujarat"),
    "jaipur": ("Jaipur", "Rajasthan"),
    "chandigarh": ("Chandigarh", "Chandigarh"),
    "lucknow": ("Lucknow", "Uttar Pradesh"),
    "kochi": ("Kochi", "Kerala"),
    "coimbatore": ("Coimbatore", "Tamil Nadu"),
    "indore": ("Indore", "Madhya Pradesh"),
}


class RawListingInput(BaseModel):
    """Raw incoming listing from an authorized partner or uploaded feed."""
    provider_name: str = Field(..., description="Name of the data provider or feed")
    source_listing_id: str = Field(..., description="Unique ID in the source system")
    source_url: str = Field(..., description="Canonical source listing URL")
    make: str
    model: str
    variant: Optional[str] = "Standard"
    year: int
    asking_price: float
    currency: str = "INR"
    odometer_km: int
    fuel_type: str
    transmission: str
    owners_count: int = 1
    city: str
    state: Optional[str] = None
    body_style: Optional[str] = None
    seller_type: Optional[str] = "dealer"
    observed_at: Optional[datetime] = None
    is_demo: bool = False
    raw_payload: Optional[Dict[str, Any]] = None

    @field_validator("asking_price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v < 25000:
            raise ValueError("Asking price must be at least ₹25,000")
        if v > 100000000:
            raise ValueError("Asking price exceeds plausible ceiling of ₹10 Crore")
        return float(v)

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        current_year = datetime.now().year
        if v < 1995 or v > current_year + 1:
            raise ValueError(f"Year {v} is outside acceptable range (1995 - {current_year + 1})")
        return v

    @field_validator("odometer_km")
    @classmethod
    def validate_odometer(cls, v: int) -> int:
        if v < 0 or v > 500000:
            raise ValueError(f"Odometer reading {v} km is outside realistic bounds (0 - 500,000 km)")
        return v

    @field_validator("owners_count")
    @classmethod
    def validate_owners(cls, v: int) -> int:
        if v < 1 or v > 8:
            raise ValueError("Owners count must be between 1 and 8")
        return v


class NormalizedListing(BaseModel):
    """Cleaned, validated, and normalized listing record stored in CarX."""
    id: Optional[str] = None
    provider_name: str
    source_listing_id: str
    source_url: str
    make: str
    model: str
    variant: str
    year: int
    asking_price: float
    currency: str = "INR"
    odometer_km: int
    fuel_type: FuelType
    transmission: Transmission
    body_style: BodyStyle
    owners_count: int
    city: str
    state: str
    seller_type: SellerType = SellerType.DEALER
    listing_status: ListingStatus = ListingStatus.ACTIVE
    is_demo: bool = False
    match_confidence: float = 1.0
    first_observed_at: datetime = Field(default_factory=utc_now)
    last_observed_at: datetime = Field(default_factory=utc_now)
    raw_payload: Optional[Dict[str, Any]] = None

    # Computed fields
    age_years: Optional[int] = None

    @model_validator(mode="after")
    def compute_age(self) -> NormalizedListing:
        current_year = datetime.now().year
        self.age_years = max(0, current_year - self.year)
        return self


class ListingSearchResult(BaseModel):
    items: List[NormalizedListing]
    total: int
    page: int
    page_size: int
    total_pages: int


class IngestionReport(BaseModel):
    provider_name: str
    total_received: int
    total_ingested: int
    duplicates_detected: int
    price_updates: int
    errors: List[Dict[str, Any]]
