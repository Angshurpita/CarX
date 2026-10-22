"""Indian automotive normalization service for makes, models, variants, fuels, transmissions, and cities."""
from typing import Tuple
from backend.app.schemas.listing import (
    BodyStyle,
    FuelType,
    INDIAN_CITY_STATE_MAP,
    ListingStatus,
    NormalizedListing,
    RawListingInput,
    SellerType,
    Transmission,
)

# Canonical Make Mapping
MAKE_NORMALIZATION = {
    "maruti": "Maruti Suzuki",
    "maruti suzuki": "Maruti Suzuki",
    "hyundai": "Hyundai",
    "honda": "Honda",
    "tata": "Tata",
    "tata motors": "Tata",
    "mahindra": "Mahindra",
    "kia": "Kia",
    "toyota": "Toyota",
    "volkswagen": "Volkswagen",
    "vw": "Volkswagen",
    "skoda": "Skoda",
    "mg": "MG",
    "mg motor": "MG",
    "renault": "Renault",
    "nissan": "Nissan",
    "ford": "Ford",
    "bmw": "BMW",
    "mercedes": "Mercedes-Benz",
    "mercedes-benz": "Mercedes-Benz",
    "audi": "Audi",
    "jeep": "Jeep",
    "volvo": "Volvo",
}

# Common Model Normalization
MODEL_NORMALIZATION = {
    "swift dzire": "Dzire",
    "swift-dzire": "Dzire",
    "i 20": "i20",
    "i-20": "i20",
    "i20": "i20",
    "grand i10": "Grand i10",
    "grand i-10": "Grand i10",
    "grand i 10": "Grand i10",
    "innova": "Innova Crysta",
    "innova crysta": "Innova Crysta",
    "innova hycross": "Innova Hycross",
    "xuv 700": "XUV700",
    "xuv-700": "XUV700",
    "xuv700": "XUV700",
    "xuv 300": "XUV300",
    "xuv-300": "XUV300",
    "xuv300": "XUV300",
    "scorpio n": "Scorpio-N",
    "scorpio-n": "Scorpio-N",
    "scorpio classic": "Scorpio Classic",
    "bolero neo": "Bolero Neo",
    "wagon r": "WagonR",
    "wagon-r": "WagonR",
    "wagonr": "WagonR",
    "xl 6": "XL6",
    "xl-6": "XL6",
    "xl6": "XL6",
    "3 series": "3 Series",
    "5 series": "5 Series",
    "c class": "C-Class",
    "c-class": "C-Class",
    "e class": "E-Class",
    "e-class": "E-Class",
    "glc": "GLC",
    "glc-class": "GLC",
    "zs ev": "ZS EV",
    "zsev": "ZS EV",
    "nexon ev": "Nexon EV",
    "nexonev": "Nexon EV",
}

# Model to default BodyStyle mapping
MODEL_BODYSTYLE_MAP = {
    "swift": BodyStyle.HATCHBACK,
    "baleno": BodyStyle.HATCHBACK,
    "wagon r": BodyStyle.HATCHBACK,
    "wagonr": BodyStyle.HATCHBACK,
    "alto": BodyStyle.HATCHBACK,
    "i20": BodyStyle.HATCHBACK,
    "grand i10": BodyStyle.HATCHBACK,
    "tiago": BodyStyle.HATCHBACK,
    "altroz": BodyStyle.HATCHBACK,
    "polo": BodyStyle.HATCHBACK,
    "kwid": BodyStyle.HATCHBACK,
    
    "city": BodyStyle.SEDAN,
    "verna": BodyStyle.SEDAN,
    "dzire": BodyStyle.SEDAN,
    "amaze": BodyStyle.SEDAN,
    "slavia": BodyStyle.SEDAN,
    "virtus": BodyStyle.SEDAN,
    "ciaz": BodyStyle.SEDAN,
    
    "creta": BodyStyle.SUV,
    "seltos": BodyStyle.SUV,
    "brezza": BodyStyle.SUV,
    "nexon": BodyStyle.SUV,
    "harrier": BodyStyle.SUV,
    "safari": BodyStyle.SUV,
    "xuv700": BodyStyle.SUV,
    "xuv300": BodyStyle.SUV,
    "scorpio-n": BodyStyle.SUV,
    "scorpio": BodyStyle.SUV,
    "thar": BodyStyle.SUV,
    "venue": BodyStyle.SUV,
    "sonet": BodyStyle.SUV,
    "kushaq": BodyStyle.SUV,
    "taigun": BodyStyle.SUV,
    "fortuner": BodyStyle.SUV,
    
    "ertiga": BodyStyle.MUV,
    "xl6": BodyStyle.MUV,
    "innova": BodyStyle.MUV,
    "innova crysta": BodyStyle.MUV,
    "innova hycross": BodyStyle.MUV,
    "carens": BodyStyle.MUV,
    "carnival": BodyStyle.MUV,
    "triber": BodyStyle.MUV,

    "punch": BodyStyle.SUV,
    "curvv": BodyStyle.SUV,
    "fronx": BodyStyle.SUV,
    "grand vitara": BodyStyle.SUV,
    "jimny": BodyStyle.SUV,
    "exter": BodyStyle.SUV,
    "alcazar": BodyStyle.SUV,
    "tucson": BodyStyle.SUV,
    "elevate": BodyStyle.SUV,
    "kodiaq": BodyStyle.SUV,
    "hector": BodyStyle.SUV,
    "astor": BodyStyle.SUV,
    "zs ev": BodyStyle.SUV,
    "compass": BodyStyle.SUV,
    "meridian": BodyStyle.SUV,
    "bolero": BodyStyle.SUV,
    "bolero neo": BodyStyle.SUV,
    "urban cruiser hyryder": BodyStyle.SUV,
    "hyryder": BodyStyle.SUV,
    "glanza": BodyStyle.HATCHBACK,
    "camry": BodyStyle.SEDAN,
    "octavia": BodyStyle.SEDAN,
    "superb": BodyStyle.SEDAN,
    
    "3 series": BodyStyle.LUXURY,
    "5 series": BodyStyle.LUXURY,
    "x1": BodyStyle.LUXURY,
    "x3": BodyStyle.LUXURY,
    "x5": BodyStyle.LUXURY,
    "c-class": BodyStyle.LUXURY,
    "e-class": BodyStyle.LUXURY,
    "glc": BodyStyle.LUXURY,
    "gle": BodyStyle.LUXURY,
    "a4": BodyStyle.LUXURY,
    "a6": BodyStyle.LUXURY,
    "q3": BodyStyle.LUXURY,
    "q5": BodyStyle.LUXURY,
    "q7": BodyStyle.LUXURY,
}


def normalize_make(make: str) -> str:
    cleaned = make.strip().lower()
    return MAKE_NORMALIZATION.get(cleaned, make.strip().title())


def normalize_model(model: str) -> str:
    cleaned = model.strip().lower()
    return MODEL_NORMALIZATION.get(cleaned, model.strip().title())


def normalize_fuel(fuel_str: str) -> FuelType:
    cleaned = fuel_str.strip().lower()
    if "cng" in cleaned:
        return FuelType.CNG
    if "diesel" in cleaned:
        return FuelType.DIESEL
    if "electric" in cleaned or "ev" in cleaned:
        return FuelType.ELECTRIC
    if "hybrid" in cleaned:
        return FuelType.HYBRID
    return FuelType.PETROL


def normalize_transmission(trans_str: str) -> Transmission:
    cleaned = trans_str.strip().lower()
    if "amt" in cleaned or "ags" in cleaned:
        return Transmission.AMT
    if "cvt" in cleaned:
        return Transmission.CVT
    if "dct" in cleaned or "dsg" in cleaned:
        return Transmission.DCT
    if "auto" in cleaned or cleaned == "at":
        return Transmission.AUTOMATIC
    return Transmission.MANUAL


def normalize_city_state(city_str: str, provided_state: str = None) -> Tuple[str, str]:
    cleaned = city_str.strip().lower()
    if cleaned in INDIAN_CITY_STATE_MAP:
        return INDIAN_CITY_STATE_MAP[cleaned]
    # Fallback to provided state or generic normalization
    norm_city = city_str.strip().title()
    norm_state = (provided_state or "India").strip().title()
    return norm_city, norm_state


def infer_body_style(model: str, provided_body_style: str = None) -> BodyStyle:
    if provided_body_style:
        for bs in BodyStyle:
            if bs.value.lower() == provided_body_style.strip().lower():
                return bs
    cleaned_model = model.strip().lower()
    for known_model, bs in MODEL_BODYSTYLE_MAP.items():
        if known_model in cleaned_model:
            return bs
    return BodyStyle.SUV  # Popular Indian segment default if unspecified


def normalize_listing_record(raw: RawListingInput) -> NormalizedListing:
    """Transform and normalize raw listing input into canonical NormalizedListing."""
    norm_make = normalize_make(raw.make)
    norm_model = normalize_model(raw.model)
    norm_fuel = normalize_fuel(raw.fuel_type)
    norm_transmission = normalize_transmission(raw.transmission)
    norm_city, norm_state = normalize_city_state(raw.city, raw.state)
    norm_body = infer_body_style(norm_model, raw.body_style)
    
    seller = SellerType.DEALER
    if raw.seller_type:
        st_clean = raw.seller_type.strip().lower()
        if "individual" in st_clean:
            seller = SellerType.INDIVIDUAL
        elif "certified" in st_clean:
            seller = SellerType.CERTIFIED_DEALER

    variant_clean = (raw.variant or "Standard").strip().title()

    return NormalizedListing(
        id=f"{raw.provider_name}_{raw.source_listing_id}",
        provider_name=raw.provider_name,
        source_listing_id=raw.source_listing_id,
        source_url=raw.source_url,
        make=norm_make,
        model=norm_model,
        variant=variant_clean,
        year=raw.year,
        asking_price=raw.asking_price,
        currency="INR",
        odometer_km=raw.odometer_km,
        fuel_type=norm_fuel,
        transmission=norm_transmission,
        body_style=norm_body,
        owners_count=raw.owners_count,
        city=norm_city,
        state=norm_state,
        seller_type=seller,
        listing_status=ListingStatus.ACTIVE,
        is_demo=raw.is_demo,
        match_confidence=1.0,
        raw_payload=raw.raw_payload or raw.model_dump(),
        image_url=raw.image_url,
    )
