from datetime import datetime, timezone
from fastapi.testclient import TestClient
import pytest

from backend.app.db.session import Base, SessionLocal, engine
from backend.app.main import app
from backend.app.models.listing import ListingModel, ListingPriceHistoryModel


@pytest.fixture(scope="module")
def client_and_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    with TestClient(app) as test_client:
        yield test_client, db
    db.close()


def test_create_and_list_saved_searches(client_and_db):
    client, _ = client_and_db
    payload = {
        "user_email": "car_buyer@example.com",
        "query_params": {"make": "Honda", "model": "City", "city": "Mumbai"},
        "target_price_drop_pct": 5.0,
    }
    create_res = client.post("/api/v1/saved-searches", json=payload)
    assert create_res.status_code == 200
    data = create_res.json()
    assert data["id"] > 0
    assert data["user_email"] == "car_buyer@example.com"

    # List
    list_res = client.get("/api/v1/saved-searches?email=car_buyer@example.com")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert items[0]["query_params"]["make"] == "Honda"


def test_detect_price_drop_alerts(client_and_db):
    client, db = client_and_db

    # Create a test listing with price drop history
    test_id = "test_price_drop_car_01"
    existing = db.query(ListingModel).filter(ListingModel.id == test_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    now = datetime.now(timezone.utc)
    listing = ListingModel(
        id=test_id,
        provider_name="test_feed",
        source_listing_id="pd_01",
        source_url="https://carx.in/demo/pd_01",
        make="Maruti Suzuki",
        model="Swift",
        variant="ZXI",
        year=2021,
        asking_price=570000.0,  # Dropped from 620,000
        currency="INR",
        odometer_km=30000,
        fuel_type="Petrol",
        transmission="Manual",
        body_style="Hatchback",
        owners_count=1,
        city="Delhi",
        state="Delhi",
    )
    db.add(listing)
    db.commit()

    # Add 2 price history entries
    h1 = ListingPriceHistoryModel(
        listing_id=test_id,
        price=620000.0,
        observed_at=now,
    )
    h2 = ListingPriceHistoryModel(
        listing_id=test_id,
        price=570000.0,
        observed_at=now,
    )
    db.add_all([h1, h2])
    db.commit()

    # Query alert endpoint
    alert_res = client.get("/api/v1/saved-searches/alerts?min_drop_pct=5.0")
    assert alert_res.status_code == 200
    alerts = alert_res.json()
    assert len(alerts) >= 1
    matched = [a for a in alerts if a["listing_id"] == test_id]
    assert len(matched) == 1
    alert = matched[0]
    assert alert["previous_price"] == 620000.0
    assert alert["current_price"] == 570000.0
    assert alert["drop_amount"] == 50000.0
    assert alert["drop_pct"] >= 8.0
