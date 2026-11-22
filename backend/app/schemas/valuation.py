from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class ValuationRequest(BaseModel):
    # Standard CarX API Fields (Optional with defaults/sync to Cardekho fields)
    make: Optional[str] = Field(None, description="Vehicle manufacturer, e.g. Maruti Suzuki, Hyundai")
    model: str = Field(..., description="Vehicle model, e.g. Swift, Creta, City, Alto")
    variant: Optional[str] = Field("Standard", description="Trim or variant, e.g. VXI, SX")
    year: Optional[int] = Field(None, ge=1990, le=2030, description="Manufacturing year")
    odometer_km: Optional[int] = Field(None, ge=0, le=5000000, description="Odometer reading in kilometers")
    fuel_type: str = Field("Petrol", description="Fuel type: Petrol, Diesel, CNG, Electric, LPG")
    transmission: str = Field("Manual", description="Transmission: Manual, Automatic, CVT, DCT")
    owners_count: int = Field(1, ge=1, le=8, description="Number of previous owners")
    city: str = Field("Delhi", description="City location, e.g. Mumbai, Delhi, Bengaluru")
    body_style: Optional[str] = Field(None, description="Hatchback, Sedan, SUV, MUV, Luxury")

    # Cardekho Specific / Supervised Regression Training Fields
    car_name: Optional[str] = Field(None, description="Full car name, e.g. Maruti Alto, Hyundai Grand i10")
    brand: Optional[str] = Field(None, description="Brand name, e.g. Maruti, Hyundai, Tata")
    seller_type: Optional[str] = Field("Individual", description="Seller type: Individual, Dealer, Trustmark Dealer")
    transmission_type: Optional[str] = Field(None, description="Transmission type: Manual, Automatic")
    vehicle_age: Optional[int] = Field(None, ge=0, le=35, description="Vehicle age in years")
    km_driven: Optional[int] = Field(None, ge=0, le=5000000, description="Kilometers driven")
    mileage: Optional[float] = Field(None, ge=0, description="Fuel efficiency in kmpl or km/kg")
    engine: Optional[float] = Field(None, ge=0, description="Engine displacement in CC")
    max_power: Optional[float] = Field(None, ge=0, description="Max power in BHP")
    seats: Optional[int] = Field(5, ge=0, le=10, description="Seating capacity")

    @model_validator(mode="before")
    @classmethod
    def sync_fields(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        
        curr_year = datetime.now().year
        
        # Sync make <-> brand
        if not values.get("make") and values.get("brand"):
            values["make"] = values["brand"]
        elif not values.get("brand") and values.get("make"):
            values["brand"] = values["make"]
        elif not values.get("make") and not values.get("brand"):
            values["make"] = "Maruti Suzuki"
            values["brand"] = "Maruti"

        # Sync year <-> vehicle_age
        if values.get("year") is not None and values.get("vehicle_age") is None:
            values["vehicle_age"] = max(0, curr_year - int(values["year"]))
        elif values.get("vehicle_age") is not None and values.get("year") is None:
            values["year"] = curr_year - int(values["vehicle_age"])
        elif values.get("year") is None and values.get("vehicle_age") is None:
            values["year"] = curr_year - 4
            values["vehicle_age"] = 4

        # Sync odometer_km <-> km_driven
        if values.get("odometer_km") is not None and values.get("km_driven") is None:
            values["km_driven"] = int(values["odometer_km"])
        elif values.get("km_driven") is not None and values.get("odometer_km") is None:
            values["odometer_km"] = int(values["km_driven"])
        elif values.get("odometer_km") is None and values.get("km_driven") is None:
            values["odometer_km"] = 45000
            values["km_driven"] = 45000

        # Sync transmission <-> transmission_type
        if values.get("transmission_type") is None:
            trans = str(values.get("transmission", "Manual")).strip().lower()
            values["transmission_type"] = "Automatic" if ("auto" in trans or "cvt" in trans or "dct" in trans or "amt" in trans) else "Manual"
        elif values.get("transmission") is None:
            values["transmission"] = values["transmission_type"]

        # Default car_name
        if not values.get("car_name"):
            brand_val = values.get("brand") or values.get("make") or ""
            model_val = values.get("model") or ""
            values["car_name"] = f"{brand_val} {model_val}".strip()

        return values


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
    market_trends: Optional[Dict[str, Any]] = Field(None, description="Current market demand, liquidity, retention and trends")
    price_breakdown: Optional[Dict[str, Any]] = Field(None, description="Trade-in instant cash, private party, and dealer retail estimates")
    valuation_factors: Optional[list] = Field(None, description="Key value drivers including mileage, age, metro tax, ownership")
    portal_benchmarks: Optional[Dict[str, Any]] = Field(None, description="Expected price bands across CarWale, Spinny, Cars24, and CarDekho")
    ai_engine: Optional[str] = Field("Gemma / Gemini Automotive AI", description="AI engine provider and status")
    disclaimer: str = Field(
        "Estimated fair asking price reflects statistical market central tendency. It does not predict the exact closing transaction price. Physical certified inspection is strongly recommended.",
        description="Mandatory consumer disclosure"
    )
