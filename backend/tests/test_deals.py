from fastapi.testclient import TestClient
import pytest

from backend.app.db.session import Base, SessionLocal, engine
from backend.app.main import app
from backend.app.services.costs import CrossCityCostService
from backend.app.services.repository import ListingRepository


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    ListingRepository.seed_sample_data_if_empty(db, sample_path="data/sample/listings_sample.json")
    db.close()
    with TestClient(app) as test_client:
        yield test_client


def test_cross_city_cost_service_same_city():
    cost = CrossCityCostService.calculate(
        asking_price=600000.0,
        origin_city="Mumbai",
        origin_state="Maharashtra",
        destination_city="Mumbai",
        destination_state="Maharashtra",
    )
    assert cost.transport_cost == 0.0
    assert cost.distance_km == 0
    assert cost.is_interstate is False
    assert cost.inspection_cost == 2500.0
    assert cost.estimated_total_purchase_cost > 600000.0
    assert len(cost.cost_items) == 5


def test_cross_city_cost_service_interstate():
    cost = CrossCityCostService.calculate(
        asking_price=1200000.0,
        origin_city="Delhi",
        origin_state="Delhi",
        destination_city="Bengaluru",
        destination_state="Karnataka",
        vehicle_age_years=2,
    )
    assert cost.transport_cost > 20000.0
    assert cost.distance_km > 2000
    assert cost.is_interstate is True
    assert cost.rto_transfer_cost > 50000.0  # Karnataka road tax
    assert any("karnataka rto road tax" in f.lower() for f in cost.risk_flags)
    assert len(cost.unknown_assumptions) > 0


def test_deals_compare_api(client):
    payload = {
        "buyer_city": "Mumbai",
        "make": "Maruti Suzuki",
        "model": "Swift",
    }
    response = client.post("/api/v1/deals/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["buyer_city"] == "Mumbai"
    assert data["total_candidates"] >= 2
    candidates = data["candidates"]

    # Check first candidate fields
    first = candidates[0]
    assert "deal_score" in first
    assert "price_difference" in first
    assert "estimated_total_purchase_cost" in first
    assert "cost_breakdown" in first
    assert len(first["recommendation_reasons"]) > 0

    # Verify descending sort by deal_score
    scores = [c["deal_score"] for c in candidates]
    assert scores == sorted(scores, reverse=True)


def test_deals_search_api(client):
    payload = {
        "buyer_city": "Delhi",
        "max_budget": 1500000.0,
        "page_size": 5,
    }
    response = client.post("/api/v1/deals/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["candidates"]) > 0
    for cand in data["candidates"]:
        assert cand["estimated_total_purchase_cost"] <= 1500000.0
