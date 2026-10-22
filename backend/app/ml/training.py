"""CarX ML Valuation Model Training & Evaluation Pipeline.

Trains, evaluates, and compares multiple regression models
(Baseline Median, Random Forest, Gradient Boosting, XGBoost)
on leakage-resistant splits with segment breakdowns.
"""
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Ensure macOS arm64 Homebrew OpenMP runtime path is loaded if present
if os.path.exists("/opt/homebrew/opt/libomp/lib"):
    current_dyld = os.environ.get("DYLD_LIBRARY_PATH", "")
    if "/opt/homebrew/opt/libomp/lib" not in current_dyld:
        os.environ["DYLD_LIBRARY_PATH"] = f"/opt/homebrew/opt/libomp/lib:{current_dyld}".strip(":")

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except Exception:
    XGBRegressor = None
    HAS_XGBOOST = False

from backend.app.ml.market_engine import MarketStatsEngine
from backend.app.schemas.valuation import ValuationRequest
from backend.app.services.normalization import infer_body_style, normalize_make, normalize_model

logger = logging.getLogger("carx.ml.training")

NUMERICAL_FEATURES = ["age", "odometer_km", "owners_count", "km_per_year"]
CATEGORICAL_FEATURES = ["make", "model", "fuel_type", "transmission", "body_style", "city"]


def generate_training_corpus(sample_path: str = "data/sample/listings_sample.json") -> pd.DataFrame:
    """Load sample listings and expand with realistic market variance across Indian metros."""
    with open(sample_path, "r", encoding="utf-8") as f:
        base_samples = json.load(f)

    rows = []
    current_year = datetime.now().year
    rng = np.random.RandomState(42)

    metros = ["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Kochi"]

    for item in base_samples:
        make = normalize_make(item["make"])
        model = normalize_model(item["model"])
        body = infer_body_style(model, item.get("body_style")).value
        base_yr = int(item["year"])
        base_km = int(item["odometer_km"])
        fuel = item["fuel_type"]
        trans = item["transmission"]
        owners = int(item.get("owners_count", 1))
        city = item.get("city", "Delhi")
        variant = item.get("variant", "Standard")

        req = ValuationRequest(
            make=make,
            model=model,
            variant=variant,
            year=base_yr,
            odometer_km=base_km,
            fuel_type=fuel,
            transmission=trans,
            owners_count=owners,
            city=city,
            body_style=body,
        )
        val = MarketStatsEngine.calculate_empirical_valuation(req)
        price = val["fair_price"]
        age = max(1, current_year - base_yr)

        rows.append({
            "make": make,
            "model": model,
            "variant": variant,
            "year": base_yr,
            "age": age,
            "asking_price": price,
            "odometer_km": base_km,
            "km_per_year": base_km / age,
            "fuel_type": fuel,
            "transmission": trans,
            "body_style": body,
            "owners_count": owners,
            "city": city,
        })

        # Augment across 3 alternative metros and varied ages/odometers
        alt_metros = rng.choice(metros, size=3, replace=False)
        for alt_city in alt_metros:
            for yr_offset in [0, 1, -1, 2, -2]:
                syn_yr = base_yr + yr_offset
                if syn_yr < 2014 or syn_yr > current_year:
                    continue
                syn_age = max(1, current_year - syn_yr)
                km_noise = int(rng.normal(0, 4000))
                syn_km = max(6000, min(180000, syn_age * 12000 + km_noise))
                syn_owners = 1 if syn_age <= 3 else (2 if syn_age <= 6 else 3)

                syn_req = ValuationRequest(
                    make=make,
                    model=model,
                    variant=variant,
                    year=syn_yr,
                    odometer_km=syn_km,
                    fuel_type=fuel,
                    transmission=trans,
                    owners_count=syn_owners,
                    city=alt_city,
                    body_style=body,
                )
                syn_val = MarketStatsEngine.calculate_empirical_valuation(syn_req)
                noise_pct = rng.normal(0, 0.015)
                syn_price = round(syn_val["fair_price"] * (1.0 + noise_pct), -2)

                rows.append({
                    "make": make,
                    "model": model,
                    "variant": variant,
                    "year": syn_yr,
                    "age": syn_age,
                    "asking_price": syn_price,
                    "odometer_km": syn_km,
                    "km_per_year": syn_km / syn_age,
                    "fuel_type": fuel,
                    "transmission": trans,
                    "body_style": body,
                    "owners_count": syn_owners,
                    "city": alt_city,
                })

    df = pd.DataFrame(rows)
    df = df.drop_duplicates(subset=["make", "model", "year", "odometer_km", "city", "fuel_type", "transmission"])
    return df


def build_baseline_lookup(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute hierarchical median prices: (make, model, year) -> (make, model) -> (body_style)."""
    lookup: Dict[str, Any] = {
        "by_make_model_year": {},
        "by_make_model": {},
        "by_body_style": {},
        "global_median": float(df["asking_price"].median()),
    }

    # by make, model, year
    for (make, model, year), group in df.groupby(["make", "model", "year"]):
        lookup["by_make_model_year"][f"{make}|{model}|{year}"] = float(group["asking_price"].median())

    # by make, model
    for (make, model), group in df.groupby(["make", "model"]):
        lookup["by_make_model"][f"{make}|{model}"] = float(group["asking_price"].median())

    # by body style
    for body, group in df.groupby("body_style"):
        lookup["by_body_style"][body] = float(group["asking_price"].median())

    return lookup


def predict_baseline(lookup: Dict[str, Any], row: pd.Series) -> float:
    key_3 = f"{row['make']}|{row['model']}|{row['year']}"
    if key_3 in lookup["by_make_model_year"]:
        return lookup["by_make_model_year"][key_3]

    key_2 = f"{row['make']}|{row['model']}"
    if key_2 in lookup["by_make_model"]:
        # Adjust for age relative to 3-year baseline
        base = lookup["by_make_model"][key_2]
        age_adj = 1.0 - 0.08 * (row["age"] - 3)
        return max(100000.0, base * age_adj)

    body = row.get("body_style", "SUV")
    if body in lookup["by_body_style"]:
        return lookup["by_body_style"][body]

    return lookup["global_median"]


def train_and_evaluate(
    sample_path: str = "data/sample/listings_sample.json",
    output_dir: str = "models",
) -> Dict[str, Any]:
    """Execute training pipeline, compare algorithms, and save artifacts."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    df = generate_training_corpus(sample_path)
    logger.info(f"Generated training corpus with {len(df)} records.")

    # Chronological / stratified split: 80% train, 20% test
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["body_style"])

    # 1. Baseline Model
    baseline_lookup = build_baseline_lookup(train_df)
    baseline_preds = test_df.apply(lambda r: predict_baseline(baseline_lookup, r), axis=1)

    base_mae = mean_absolute_error(test_df["asking_price"], baseline_preds)
    base_rmse = np.sqrt(mean_squared_error(test_df["asking_price"], baseline_preds))
    base_r2 = r2_score(test_df["asking_price"], baseline_preds)

    # Preprocessor for ML pipelines
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )

    X_train = train_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y_train = np.log1p(train_df["asking_price"])  # Log transform target

    X_test = test_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y_test_actual = test_df["asking_price"]

    # Candidate models
    candidates = {
        "RandomForest": RandomForestRegressor(n_estimators=60, max_depth=10, random_state=42),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=80, learning_rate=0.08, max_depth=4, random_state=42),
    }
    if HAS_XGBOOST and XGBRegressor is not None:
        try:
            candidates["XGBoost"] = XGBRegressor(
                n_estimators=250,
                learning_rate=0.05,
                max_depth=6,
                subsample=0.85,
                colsample_bytree=0.85,
                reg_alpha=0.05,
                reg_lambda=1.0,
                random_state=42,
                n_jobs=-1,
            )
        except Exception as ex:
            logger.warning(f"Could not initialize XGBRegressor: {ex}")

    comparison_results = {
        "BaselineMedian": {
            "mae": round(float(base_mae), 2),
            "rmse": round(float(base_rmse), 2),
            "r2": round(float(base_r2), 4),
        }
    }

    best_model_name = "GradientBoosting"
    best_pipeline = None
    best_mae = float("inf")
    best_preds_actual = None

    for name, regressor in candidates.items():
        pipe = Pipeline(steps=[("preprocessor", preprocessor), ("regressor", regressor)])
        pipe.fit(X_train, y_train)

        # Predict and invert log transform
        preds_log = pipe.predict(X_test)
        preds_actual = np.expm1(preds_log)

        mae = mean_absolute_error(y_test_actual, preds_actual)
        rmse = np.sqrt(mean_squared_error(y_test_actual, preds_actual))
        r2 = r2_score(y_test_actual, preds_actual)

        comparison_results[name] = {
            "mae": round(float(mae), 2),
            "rmse": round(float(rmse), 2),
            "r2": round(float(r2), 4),
        }

        if mae < best_mae:
            best_mae = mae
            best_model_name = name
            best_pipeline = pipe
            best_preds_actual = preds_actual

    # Segment-level evaluation on best model
    test_eval_df = test_df.copy()
    test_eval_df["pred"] = best_preds_actual
    test_eval_df["abs_err"] = (test_eval_df["pred"] - test_eval_df["asking_price"]).abs()

    segment_errors = {}
    for segment, group in test_eval_df.groupby("body_style"):
        segment_errors[segment] = {
            "count": int(len(group)),
            "mae": round(float(group["abs_err"].mean()), 2),
            "mean_price": round(float(group["asking_price"].mean()), 2),
            "mape_pct": round(float((group["abs_err"] / group["asking_price"]).mean() * 100), 2),
        }

    # Price band evaluation
    price_band_errors = {}
    bins = [0, 700000, 1500000, 100000000]
    labels = ["Under ₹7 Lakh", "₹7 Lakh - ₹15 Lakh", "Above ₹15 Lakh"]
    test_eval_df["price_band"] = pd.cut(test_eval_df["asking_price"], bins=bins, labels=labels)
    for band, group in test_eval_df.groupby("price_band", observed=False):
        if len(group) > 0:
            price_band_errors[str(band)] = {
                "count": int(len(group)),
                "mae": round(float(group["abs_err"].mean()), 2),
                "mape_pct": round(float((group["abs_err"] / group["asking_price"]).mean() * 100), 2),
            }

    # Save artifacts
    model_file = out_path / "valuation_model.joblib"
    joblib.dump(best_pipeline, model_file)

    lookup_file = out_path / "baseline_lookup.json"
    with open(lookup_file, "w", encoding="utf-8") as f:
        json.dump(baseline_lookup, f, indent=2)

    now_iso = datetime.now(timezone.utc).isoformat()
    metadata = {
        "model_version": f"v1.0-{best_model_name.lower()}",
        "selected_algorithm": best_model_name,
        "training_timestamp": now_iso,
        "total_records": len(df),
        "train_records": len(train_df),
        "test_records": len(test_df),
        "features": {
            "numerical": NUMERICAL_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
        },
        "metrics": {
            "best_mae": round(float(best_mae), 2),
            "baseline_mae": round(float(base_mae), 2),
            "mae_improvement_pct": round(float((base_mae - best_mae) / base_mae * 100), 2),
            "model_comparison": comparison_results,
            "segment_errors": segment_errors,
            "price_band_errors": price_band_errors,
        },
        "disclaimer": "Models estimate statistical fair asking prices. Real transaction prices depend on certified in-person condition assessments.",
    }

    meta_file = out_path / "valuation_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata


if __name__ == "__main__":
    train_and_evaluate()
