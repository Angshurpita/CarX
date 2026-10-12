import tempfile
from pathlib import Path
import pytest
from pydantic import ValidationError

from backend.app.schemas.listing import (
    BodyStyle,
    FuelType,
    RawListingInput,
    Transmission,
)
from backend.app.services.ingestion import (
    CsvDataProvider,
    IngestionCoordinator,
    SampleDataProvider,
)
from backend.app.services.normalization import (
    normalize_listing_record,
    normalize_make,
    normalize_model,
)


def test_schema_validation_valid():
    raw = RawListingInput(
        provider_name="test_partner",
        source_listing_id="listing_101",
        source_url="https://partner.com/car/101",
        make="Hyundai",
        model="Creta",
        variant="SX Diesel",
        year=2021,
        asking_price=1250000.0,
        odometer_km=45000,
        fuel_type="Diesel",
        transmission="Manual",
        owners_count=1,
        city="Mumbai",
    )
    assert raw.make == "Hyundai"
    assert raw.asking_price == 1250000.0


def test_schema_validation_invalid_price():
    with pytest.raises(ValidationError):
        RawListingInput(
            provider_name="test_partner",
            source_listing_id="listing_102",
            source_url="https://partner.com/car/102",
            make="Hyundai",
            model="Creta",
            year=2021,
            asking_price=5000.0,  # Below minimum threshold of 25,000
            odometer_km=45000,
            fuel_type="Diesel",
            transmission="Manual",
            city="Mumbai",
        )


def test_schema_validation_invalid_year():
    with pytest.raises(ValidationError):
        RawListingInput(
            provider_name="test_partner",
            source_listing_id="listing_103",
            source_url="https://partner.com/car/103",
            make="Hyundai",
            model="Creta",
            year=1980,  # Below 1995 threshold
            asking_price=500000.0,
            odometer_km=45000,
            fuel_type="Diesel",
            transmission="Manual",
            city="Mumbai",
        )


def test_normalization_entities():
    assert normalize_make("maruti") == "Maruti Suzuki"
    assert normalize_make("vw") == "Volkswagen"
    assert normalize_model("swift dzire") == "Dzire"

    raw = RawListingInput(
        provider_name="test_partner",
        source_listing_id="listing_104",
        source_url="https://partner.com/car/104",
        make="maruti suzuki",
        model="swift",
        variant="VXI",
        year=2020,
        asking_price=550000.0,
        odometer_km=30000,
        fuel_type="petrol",
        transmission="at",
        city="bengaluru",
    )
    norm = normalize_listing_record(raw)
    assert norm.make == "Maruti Suzuki"
    assert norm.fuel_type == FuelType.PETROL
    assert norm.transmission == Transmission.AUTOMATIC
    assert norm.city == "Bengaluru"
    assert norm.state == "Karnataka"
    assert norm.body_style == BodyStyle.HATCHBACK
    assert norm.age_years >= 0


def test_sample_data_provider():
    provider = SampleDataProvider("data/sample/listings_sample.json")
    assert provider.health_check() is True
    listings = provider.fetch_raw_listings()
    assert len(listings) >= 15
    for item in listings:
        assert item.asking_price > 0
        assert item.city != ""
        assert item.is_demo is True


def test_ingestion_coordinator_and_deduplication():
    coord = IngestionCoordinator()
    provider = SampleDataProvider("data/sample/listings_sample.json")
    raw_listings = provider.fetch_raw_listings()

    # First ingestion batch
    report = coord.ingest_batch(raw_listings, provider.provider_name())
    assert report.total_ingested == len(raw_listings)
    assert report.duplicates_detected == 0
    assert report.price_updates == 0
    assert len(coord.get_all_listings()) == len(raw_listings)

    # Re-ingest same batch: duplicate detection
    report_dup = coord.ingest_batch(raw_listings, provider.provider_name())
    assert report_dup.total_ingested == 0
    assert report_dup.duplicates_detected == len(raw_listings)
    assert report_dup.price_updates == 0
    assert len(coord.get_all_listings()) == len(raw_listings)

    # Modify price of one listing and ingest
    modified_record = raw_listings[0].model_copy(update={"asking_price": 499000.0})
    report_mod = coord.ingest_batch([modified_record], provider.provider_name())
    assert report_mod.duplicates_detected == 1
    assert report_mod.price_updates == 1

    key = f"{modified_record.provider_name}:{modified_record.source_listing_id}"
    history = coord.get_price_history(key)
    assert len(history) == 2
    assert history[-1][0] == 499000.0


def test_csv_data_provider():
    csv_content = """id,source_url,make,model,variant,year,price,kms,fuel_type,transmission,owners,city,state
csv_01,https://example.com/c1,Honda,City,ZX CVT,2020,980000,35000,Petrol,CVT,1,Mumbai,Maharashtra
csv_02,https://example.com/c2,Hyundai,Creta,SX,2021,1200000,41000,Diesel,Manual,1,Delhi,Delhi
"""
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as tf:
        tf.write(csv_content)
        tf_name = tf.name

    try:
        provider = CsvDataProvider(tf_name, "fleet_dealer")
        assert provider.health_check() is True
        records = provider.fetch_raw_listings()
        assert len(records) == 2
        assert records[0].make == "Honda"
        assert records[0].asking_price == 980000.0
        assert records[1].model == "Creta"
    finally:
        Path(tf_name).unlink()
