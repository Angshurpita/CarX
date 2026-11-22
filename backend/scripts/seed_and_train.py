#!/usr/bin/env python3
"""CarX Bootstrap & Training Script.

Ensures sample data is ingested, model training is executed on the Cardekho dataset,
and model artifacts (joblib, lightweight JSON, baseline lookup, metadata) are exported.
"""
import os
import sys
from pathlib import Path

# Add project root and backend dir to sys.path
_script_dir = Path(__file__).resolve().parent
_project_root = _script_dir.parent
_backend_dir = _project_root / "backend"

for p in [str(_project_root), str(_backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.db.session import Base, SessionLocal, engine
from backend.app.ml.training import train_and_evaluate
from backend.app.services.repository import ListingRepository


def main():
    print("🚗 Initializing CarX Database Tables...", flush=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("📦 Seeding Sample Verified Listings...", flush=True)
    sample_file = _project_root / "data" / "sample" / "listings_sample.json"
    if not sample_file.exists():
        sample_file = _backend_dir / "data" / "sample" / "listings_sample.json"
    if sample_file.exists():
        ListingRepository.seed_sample_data(db, sample_path=str(sample_file), force=True)
    db.close()

    print("🧠 Training CarX Machine Learning Valuation Models on Cardekho Dataset...", flush=True)
    data_file = _project_root / "data" / "cardekho_imputated.csv"
    if not data_file.exists():
        data_file = _backend_dir / "data" / "cardekho_imputated.csv"

    out_dir = _project_root / "models"
    meta = train_and_evaluate(
        sample_path=str(data_file),
        output_dir=str(out_dir),
    )
    print("✅ Training completed successfully!", flush=True)
    print(f"Selected Algorithm: {meta['selected_algorithm']}", flush=True)
    print(f"Best MAE: ₹{meta['metrics']['best_mae']:,}", flush=True)
    print(f"Best RMSE: ₹{meta['metrics']['best_rmse']:,}", flush=True)
    print(f"Best R2 Score: {meta['metrics']['best_r2']:.4f}", flush=True)
    print(f"Baseline Median MAE: ₹{meta['metrics']['baseline_mae']:,}", flush=True)
    print(f"Performance Improvement: {meta['metrics']['mae_improvement_pct']}%", flush=True)


if __name__ == "__main__":
    main()
