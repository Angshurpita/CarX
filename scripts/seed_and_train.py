
Ensures sample data is ingested, model training is executed on the Cardekho dataset,
and model artifacts (joblib, lightweight JSON, baseline lookup, metadata) are exported.
"""
import sys
from pathlib import Path


from backend.app.db.session import Base, SessionLocal, engine
from backend.app.ml.training import train_and_evaluate
from backend.app.services.repository import ListingRepository


def main():
    print("🚗 Initializing CarX Database Tables...", flush=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("📦 Seeding Sample Verified Listings...", flush=True)
    ListingRepository.seed_sample_data(db, sample_path="data/sample/listings_sample.json", force=True)
    db.close()

    print("🧠 Training CarX Machine Learning Valuation Models on Cardekho Dataset...", flush=True)
    meta = train_and_evaluate(
        sample_path="data/cardekho_imputated.csv",
        output_dir="models",
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
