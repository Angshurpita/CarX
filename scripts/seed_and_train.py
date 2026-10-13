#!/usr/bin/env python3
"""CarX Bootstrap & Training Script.

Ensures sample data is ingested, model training is executed,
and baseline lookup metadata is saved.
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.db.session import Base, SessionLocal, engine
from backend.app.ml.training import train_and_evaluate
from backend.app.services.repository import ListingRepository

def main():
    print("🚗 Initializing CarX Database Tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("📦 Seeding Sample Verified Listings...")
    ListingRepository.seed_sample_data(db, sample_path="data/sample/listings_sample.json", force=True)
    db.close()

    print("🧠 Training CarX Machine Learning Valuation Models...")
    meta = train_and_evaluate(
        sample_path="data/sample/listings_sample.json",
        output_dir="models",
    )
    print(f"✅ Training completed successfully!")
    print(f"Selected Algorithm: {meta['selected_algorithm']}")
    print(f"Best MAE: ₹{meta['metrics']['best_mae']:,}")
    print(f"Baseline Median MAE: ₹{meta['metrics']['baseline_mae']:,}")
    print(f"Performance Improvement: {meta['metrics']['mae_improvement_pct']}%")

if __name__ == "__main__":
    main()
