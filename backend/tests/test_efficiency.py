from fastapi.testclient import TestClient
import pytest

from backend.app.db.session import Base, SessionLocal, engine
from backend.app.main import app
from backend.app.services.repository import ListingRepository


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    ListingRepository.seed_sample_data_if_empty(db, sample_path="data/sample/listings_sample.json")
    db.close()
    with TestClient(app) as test_client:
        yield test_client


def test_cache_stats_endpoint(client):
    res = client.get("/api/v1/cache/stats")
    assert res.status_code == 200
    data = res.json()
    assert "hits" in data
    assert "misses" in data
    assert "hit_ratio" in data
    assert "size" in data


def test_assistant_streaming_sse(client):
    payload = {
        "messages": [
            {"role": "user", "content": "Find a diesel SUV in Delhi under 15 lakh"}
        ]
    }
    with client.stream("POST", "/api/v1/assistant/stream", json=payload) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        chunks = list(response.iter_lines())
        data_lines = [c for c in chunks if c.startswith("data: ")]
        assert len(data_lines) > 0
        assert any("token" in line or "tool" in line for line in data_lines)
