from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.app.main import app
from backend.app.ml.training import train_and_evaluate
from backend.app.ml.valuation_service import ValuationService
from backend.app.schemas.valuation import ValuationRequest


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_training_pipeline_and_artifacts(tmp_path):
    out_dir = tmp_path / "models"
    meta = train_and_evaluate(
        sample_path="data/sample/listings_sample.json",
        output_dir=str(out_dir),
    )
    assert meta is not None
    assert "metrics" in meta
    assert "best_mae" in meta["metrics"]
    assert "baseline_mae" in meta["metrics"]
    assert "model_comparison" in meta["metrics"]

    comparison = meta["metrics"]["model_comparison"]
    assert "BaselineMedian" in comparison
    assert "RandomForest" in comparison
    assert "GradientBoosting" in comparison
    if "XGBoost" in comparison:
        assert comparison["XGBoost"]["mae"] > 0

    # Check segment errors
    assert "segment_errors" in meta["metrics"]
    assert len(meta["metrics"]["segment_errors"]) > 0

    # Verify generated files
    assert (out_dir / "valuation_model.joblib").exists()
    assert (out_dir / "baseline_lookup.json").exists()
    assert (out_dir / "valuation_metadata.json").exists()


def test_valuation_service_prediction():
    service = ValuationService.get_instance()
    req = ValuationRequest(
        make="Hyundai",
        model="Creta",
        variant="SX Petrol",
        year=2021,
        odometer_km=42000,
        fuel_type="Petrol",
        transmission="Manual",
        owners_count=1,
        city="Mumbai",
    )
    res = service.estimate(req)
    assert res.estimated_fair_price > 500000.0
    assert res.price_range_low < res.estimated_fair_price
    assert res.price_range_high > res.estimated_fair_price
    assert res.baseline_median_price > 0
    assert res.confidence_score >= 0.70
    assert "statistical market central tendency" in res.disclaimer.lower()
    assert res.prediction_provenance["algorithm"] in ["GradientBoosting", "XGBoost", "RandomForest"]


def test_valuation_api_endpoint(client):
    payload = {
        "make": "Maruti Suzuki",
        "model": "Swift",
        "variant": "VXI",
        "year": 2020,
        "odometer_km": 35000,
        "fuel_type": "Petrol",
        "transmission": "Manual",
        "owners_count": 1,
        "city": "Delhi",
    }
    response = client.post("/api/v1/valuation/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["estimated_fair_price"] > 300000.0
    assert data["currency"] == "INR"
    assert data["price_range_low"] < data["estimated_fair_price"] < data["price_range_high"]
    assert data["baseline_median_price"] > 0
    assert "prediction_provenance" in data


def test_rare_or_unseen_car_fallback():
    service = ValuationService.get_instance()
    req = ValuationRequest(
        make="Force",
        model="Gurkha",
        variant="4x4",
        year=2021,
        odometer_km=30000,
        fuel_type="Diesel",
        transmission="Manual",
        owners_count=1,
        city="Pune",
        body_style="SUV",
    )
    res = service.estimate(req)
    # Should resolve gracefully using fallback without crash
    assert res.estimated_fair_price > 100000.0
    assert res.baseline_median_price > 100000.0
