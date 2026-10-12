from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ValuationRequest(BaseModel):
    make: str = Field(..., description="Vehicle manufacturer, e.g. Maruti Suzuki, Hyundai")
    model: str = Field(..., description="Vehicle model, e.g. Swift, Creta, City")
    variant: Optional[str] = Field("Standard", description="Trim or variant, e.g. VXI, SX")
    year: int = Field(..., ge=1995, le=2026, description="Manufacturing year")
    odometer_km: int = Field(..., ge=0, le=500000, description="Odometer reading in kilometers")
    fuel_type: str = Field("Petrol", description="Fuel type: Petrol, Diesel, CNG, Electric")
    transmission: str = Field("Manual", description="Transmission: Manual, Automatic, CVT, DCT")
    owners_count: int = Field(1, ge=1, le=8, description="Number of previous owners")
    city: str = Field("Delhi", description="City location, e.g. Mumbai, Delhi, Bengaluru")
    body_style: Optional[str] = Field(None, description="Hatchback, Sedan, SUV, MUV, Luxury")


class ValuationResponse(BaseModel):
    estimated_fair_price: float = Field(..., description="Statistical estimated fair asking price in INR")
    price_range_low: float = Field(..., description="Lower bound of 90% prediction interval")
    price_range_high: float = Field(..., description="Upper bound of 90% prediction interval")
    baseline_median_price: float = Field(..., description="Baseline segment/model median price for comparison")
    model_version: str = Field(..., description="Trained model identifier and algorithm")
    confidence_score: float = Field(..., description="Statistical prediction confidence (0.0 to 1.0)")
    currency: str = "INR"
    data_freshness: str = Field(..., description="Model training snapshot timestamp")
    prediction_provenance: Dict[str, Any] = Field(..., description="Provenance metadata and feature importance insights")
    disclaimer: str = Field(
        "Estimated fair asking price reflects statistical market central tendency. It does not predict the exact closing transaction price. Physical certified inspection is strongly recommended.",
        description="Mandatory consumer disclosure"
    )
