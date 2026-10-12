from fastapi.testclient import TestClient
import pytest
from backend.app.main import app
from backend.app.db.session import Base, SessionLocal, engine
from backend.app.services.repository import ListingRepository


@pytest.fixture(scope="module")
def client():
    # Setup test DB tables and seed sample data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    ListingRepository.seed_sample_data_if_empty(db, sample_path="data/sample/listings_sample.json")
    db.close()

    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"


def test_cars_metadata(client):
    response = client.get("/api/v1/cars/meta")
    assert response.status_code == 200
    meta = response.json()
    assert "makes" in meta
    assert "cities" in meta
    assert "body_styles" in meta
    assert len(meta["makes"]) > 0
    assert "Maruti Suzuki" in meta["makes"]
    assert "Delhi" in meta["cities"]


def test_search_cars_all(client):
    response = client.get("/api/v1/cars/search")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 15
    assert len(data["items"]) > 0
    assert data["page"] == 1


def test_search_cars_by_make_and_city(client):
    # Filter by make
    res_make = client.get("/api/v1/cars/search?make=Hyundai")
    assert res_make.status_code == 200
    items = res_make.json()["items"]
    assert len(items) > 0
    assert all(item["make"] == "Hyundai" for item in items)

    # Filter by city
    res_city = client.get("/api/v1/cars/search?city=Mumbai")
    assert res_city.status_code == 200
    city_items = res_city.json()["items"]
    assert len(city_items) > 0
    assert all(item["city"] == "Mumbai" for item in city_items)


def test_search_cars_price_and_sort(client):
    res_sort = client.get("/api/v1/cars/search?sort_by=price_asc&page_size=5")
    assert res_sort.status_code == 200
    items = res_sort.json()["items"]
    assert len(items) >= 2
    prices = [item["asking_price"] for item in items]
    assert prices == sorted(prices)


def test_get_listing_detail(client):
    search_res = client.get("/api/v1/cars/search?page_size=1")
    first_item = search_res.json()["items"][0]
    listing_id = first_item["id"]

    res = client.get(f"/api/v1/listings/{listing_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["listing"]["id"] == listing_id
    assert "price_history" in detail
    assert "provenance" in detail
    assert detail["provenance"]["provider_name"] == first_item["provider_name"]


def test_get_listing_not_found(client):
    res = client.get("/api/v1/listings/non_existent_id_9999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
