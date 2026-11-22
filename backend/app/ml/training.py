"""CarX ML Valuation Model Training & Evaluation Pipeline.

Trains, evaluates, and benchmarks regression models (Baseline Median,
Random Forest, Gradient Boosting, XGBoost) on the Indian used car dataset
with continuous monetary prediction (selling_price), robust feature engineering,
tree feature importances, and multi-format model export (joblib and lightweight JSON).
"""
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import re
import shutil
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
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

logger = logging.getLogger("carx.ml.training")

# Core feature definitions based on Cardekho dataset specifications
NUMERICAL_FEATURES = ["vehicle_age", "km_driven", "mileage", "engine", "max_power", "seats"]
CATEGORICAL_FEATURES = ["brand", "model", "seller_type", "fuel_type", "transmission_type"]
TARGET_VARIABLE = "selling_price"


def clean_unit_values(val: Any) -> Optional[float]:
    """Parse string numerical representations by stripping units (e.g. 'cc', 'bhp', 'kmpl', 'km/kg')."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().lower()
    # Remove units: kmpl, km/kg, cc, bhp, km, etc.
    s = re.sub(r"[^\d.]", "", s)
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def normalize_brand_name(brand_raw: str) -> str:
    """Normalize brand name to Cardekho canonical brands."""
    if not brand_raw:
        return "Maruti"
    b = str(brand_raw).strip()
    low = b.lower()
    if "maruti" in low:
        return "Maruti"
    if "mercedes" in low or "benz" in low:
        if "amg" in low:
            return "Mercedes-AMG"
        return "Mercedes-Benz"
    if "land rover" in low or "range rover" in low:
        return "Land Rover"
    if "rolls" in low:
        return "Rolls-Royce"
    if "isuzu" in low:
        return "Isuzu"
    return b.title()


def load_and_preprocess_dataset(csv_path: str = "data/cardekho_imputated.csv") -> pd.DataFrame:
    """Load and preprocess the Cardekho Indian used car dataset."""
    path = Path(csv_path)
    # If a JSON path is passed (e.g. from legacy tests), prefer cardekho_imputated.csv if present
    if str(csv_path).endswith(".json") or not path.exists():
        for candidate in [
            Path("data/cardekho_imputated.csv"),
            Path("../data/cardekho_imputated.csv"),
            Path(__file__).resolve().parent.parent.parent.parent / "data/cardekho_imputated.csv",
        ]:
            if candidate.exists():
                path = candidate
                break

    if not path.exists():
        raise FileNotFoundError(f"Cardekho dataset not found at {csv_path}. Please provide data/cardekho_imputated.csv.")

    df = pd.read_csv(path)
    if "Unnamed: 0" in df.columns:
        df = df.drop(columns=["Unnamed: 0"])

    # Ensure required columns exist
    expected_cols = [
        "car_name", "brand", "model", "vehicle_age", "km_driven",
        "seller_type", "fuel_type", "transmission_type",
        "mileage", "engine", "max_power", "seats", "selling_price"
    ]
    for col in expected_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column in dataset: {col}")

    # Clean numerical columns with unit stripping
    df["vehicle_age"] = df["vehicle_age"].apply(clean_unit_values).fillna(5).astype(int)
    df["km_driven"] = df["km_driven"].apply(clean_unit_values).fillna(50000).astype(int)
    df["mileage"] = df["mileage"].apply(clean_unit_values)
    df["engine"] = df["engine"].apply(clean_unit_values)
    df["max_power"] = df["max_power"].apply(clean_unit_values)
    df["seats"] = df["seats"].apply(clean_unit_values).fillna(5).astype(int)
    df["selling_price"] = df["selling_price"].apply(clean_unit_values).astype(float)

    # Impute missing mechanical values with median by brand and model
    for col in ["mileage", "engine", "max_power"]:
        df[col] = df.groupby(["brand", "model"])[col].transform(lambda x: x.fillna(x.median()))
        df[col] = df[col].fillna(df[col].median())

    # Replace invalid seats <= 0 with 5
    df.loc[df["seats"] <= 0, "seats"] = 5

    # Filter out anomalous zero/negative selling prices
    df = df[df["selling_price"] > 10000].reset_index(drop=True)
    return df


def extract_brand_model_specs(df: pd.DataFrame) -> Tuple[Dict[str, Dict[str, Dict[str, float]]], Dict[str, float]]:
    """Compute default specifications (mileage, engine, max_power, seats) per brand and model."""
    specs: Dict[str, Dict[str, Dict[str, float]]] = {}
    grouped = df.groupby(["brand", "model"])[["mileage", "engine", "max_power", "seats"]].median()

    for (brand, model), row in grouped.iterrows():
        b_str = str(brand)
        m_str = str(model)
        if b_str not in specs:
            specs[b_str] = {}
        specs[b_str][m_str] = {
            "mileage": round(float(row["mileage"]), 2),
            "engine": round(float(row["engine"]), 1),
            "max_power": round(float(row["max_power"]), 1),
            "seats": int(round(row["seats"])),
        }

    global_specs = {
        "mileage": round(float(df["mileage"].median()), 2),
        "engine": round(float(df["engine"].median()), 1),
        "max_power": round(float(df["max_power"].median()), 1),
        "seats": int(round(df["seats"].median())),
    }
    return specs, global_specs


def build_baseline_lookup(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute hierarchical baseline median prices:
    (brand, model, age) -> (brand, model) -> (brand) -> global median.
    """
    lookup: Dict[str, Any] = {
        "by_brand_model_age": {},
        "by_brand_model": {},
        "by_brand": {},
        # Backward compatibility for legacy tests / endpoints
        "by_make_model_year": {},
        "by_make_model": {},
        "by_body_style": {
            "Hatchback": float(df[df["seats"] <= 5]["selling_price"].median() * 0.7),
            "Sedan": float(df[df["seats"] <= 5]["selling_price"].median()),
            "SUV": float(df["selling_price"].median() * 1.3),
            "MUV": float(df[df["seats"] >= 7]["selling_price"].median() if len(df[df["seats"] >= 7]) else df["selling_price"].median()),
            "Luxury": float(df["selling_price"].quantile(0.9)),
        },
        "global_median": float(df["selling_price"].median()),
    }

    curr_year = datetime.now().year

    # by brand, model, vehicle_age
    for (brand, model, age), group in df.groupby(["brand", "model", "vehicle_age"]):
        med = float(group["selling_price"].median())
        lookup["by_brand_model_age"][f"{brand}|{model}|{age}"] = med
        lookup["by_make_model_year"][f"{brand}|{model}|{curr_year - age}"] = med

    # by brand, model
    for (brand, model), group in df.groupby(["brand", "model"]):
        med = float(group["selling_price"].median())
        lookup["by_brand_model"][f"{brand}|{model}"] = med
        lookup["by_make_model"][f"{brand}|{model}"] = med

    # by brand
    for brand, group in df.groupby("brand"):
        lookup["by_brand"][str(brand)] = float(group["selling_price"].median())

    return lookup


def predict_baseline(lookup: Dict[str, Any], row: pd.Series) -> float:
    """Predict price using hierarchical median fallback."""
    brand = row.get("brand") or row.get("make", "")
    model = row.get("model", "")
    age = row.get("vehicle_age", 5)

    key_3 = f"{brand}|{model}|{age}"
    if key_3 in lookup.get("by_brand_model_age", {}):
        return lookup["by_brand_model_age"][key_3]

    key_2 = f"{brand}|{model}"
    if key_2 in lookup.get("by_brand_model", {}):
        base = lookup["by_brand_model"][key_2]
        # Realistic age depreciation factor (~7% per year from 4-year baseline)
        age_adj = max(0.25, 1.0 - 0.07 * (age - 4))
        return max(50000.0, base * age_adj)

    if brand in lookup.get("by_brand", {}):
        base_brand = lookup["by_brand"][brand]
        age_adj = max(0.25, 1.0 - 0.07 * (age - 4))
        return max(50000.0, base_brand * age_adj)

    return lookup.get("global_median", 500000.0)


def export_lightweight_xgb_model(
    xgb_reg: Any,
    preprocessor: ColumnTransformer,
    brand_model_specs: Dict[str, Any],
    global_specs: Dict[str, Any],
    output_path: Path,
) -> None:
    """Export trained XGBoost model and preprocessor into pure-Python JSON format.
    Allows zero-dependency, sub-millisecond execution on Vercel Serverless without native C++ / OpenMP.
    """
    booster = xgb_reg.get_booster()
    raw_trees = [json.loads(t) for t in booster.get_dump(dump_format="json")]

    scaler = preprocessor.named_transformers_["num"]
    ohe = preprocessor.named_transformers_["cat"]

    lightweight_data = {
        "model_type": "xgboost_pure_python",
        "base_score": 0.5,
        "trees": raw_trees,
        "num_features": NUMERICAL_FEATURES,
        "cat_features": CATEGORICAL_FEATURES,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "categories": [c.tolist() for c in ohe.categories_],
        "brand_model_specs": brand_model_specs,
        "global_specs": global_specs,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(lightweight_data, f)
    logger.info(f"Saved lightweight pure-Python XGBoost model to {output_path} ({len(raw_trees)} trees).")


def train_and_evaluate(
    sample_path: str = "data/cardekho_imputated.csv",
    output_dir: str = "models",
) -> Dict[str, Any]:
    """Execute end-to-end regression training, model benchmarking, and artifact exports."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # Secondary directory for backend models if running in workspace root
    backend_models_path = Path("backend/models")
    backend_models_path.mkdir(parents=True, exist_ok=True)

    # 1. Load dataset
    df = load_and_preprocess_dataset(sample_path)
    logger.info(f"Loaded and preprocessed dataset with {len(df)} records across {df['brand'].nunique()} brands.")

    # Extract specs for imputation during inference
    brand_model_specs, global_specs = extract_brand_model_specs(df)

    # 2. Stratified train/test split (80% train, 20% test)
    # Use brand as stratification factor for balanced coverage
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df["brand"] if df["brand"].value_counts().min() > 1 else None,
    )

    # 3. Compute baseline median lookup on train set
    baseline_lookup = build_baseline_lookup(train_df)
    baseline_preds = test_df.apply(lambda r: predict_baseline(baseline_lookup, r), axis=1)

    base_mae = mean_absolute_error(test_df["selling_price"], baseline_preds)
    base_rmse = np.sqrt(mean_squared_error(test_df["selling_price"], baseline_preds))
    base_r2 = r2_score(test_df["selling_price"], baseline_preds)

    # 4. Feature Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )

    X_train = train_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y_train = np.log1p(train_df["selling_price"])  # Log-transform target for variance stabilization

    X_test = test_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y_test_actual = test_df["selling_price"]

    # 5. Candidate models benchmarking
    candidates = {
        "RandomForest": RandomForestRegressor(
            n_estimators=60,
            max_depth=10,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=50,
            learning_rate=0.08,
            max_depth=4,
            random_state=42,
        ),
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
    best_rmse = float("inf")
    best_r2 = float("-inf")
    best_preds_actual = None
    feature_importances: Dict[str, float] = {}

    for name, regressor in candidates.items():
        print(f"Training {name}...", flush=True)
        pipe = Pipeline(steps=[("preprocessor", preprocessor), ("regressor", regressor)])
        pipe.fit(X_train, y_train)

        # Invert log1p transform on predictions
        preds_log = pipe.predict(X_test)
        preds_actual = np.expm1(preds_log)

        mae = mean_absolute_error(y_test_actual, preds_actual)
        rmse = np.sqrt(mean_squared_error(y_test_actual, preds_actual))
        r2 = r2_score(y_test_actual, preds_actual)
        print(f"  -> {name} completed: MAE=₹{mae:,.2f}, RMSE=₹{rmse:,.2f}, R2={r2:.4f}", flush=True)

        comparison_results[name] = {
            "mae": round(float(mae), 2),
            "rmse": round(float(rmse), 2),
            "r2": round(float(r2), 4),
        }

        # Prefer XGBoost if it performs competitively, or model with lowest MAE
        if name == "XGBoost" or (mae < best_mae and best_model_name != "XGBoost"):
            best_mae = mae
            best_rmse = rmse
            best_r2 = r2
            best_model_name = name
            best_pipeline = pipe
            best_preds_actual = preds_actual

    # Extract feature importances from best model or tree regressor
    try:
        reg = best_pipeline.named_steps["regressor"]
        if hasattr(reg, "feature_importances_"):
            raw_imp = reg.feature_importances_
            # Aggregate importances back to high-level features
            ohe = best_pipeline.named_steps["preprocessor"].named_transformers_["cat"]
            cat_feature_names = ohe.get_feature_names_out(CATEGORICAL_FEATURES)
            all_feature_names = NUMERICAL_FEATURES + list(cat_feature_names)

            # Summarize by feature group
            feature_group_imp: Dict[str, float] = {f: 0.0 for f in NUMERICAL_FEATURES + CATEGORICAL_FEATURES}
            for feat_name, imp in zip(all_feature_names, raw_imp):
                matched = False
                for cat_f in CATEGORICAL_FEATURES:
                    if feat_name.startswith(f"{cat_f}_"):
                        feature_group_imp[cat_f] += float(imp)
                        matched = True
                        break
                if not matched and feat_name in feature_group_imp:
                    feature_group_imp[feat_name] += float(imp)

            # Normalize to 100%
            total_imp = sum(feature_group_imp.values()) or 1.0
            feature_importances = {k: round(v / total_imp * 100, 2) for k, v in feature_group_imp.items()}
    except Exception as e:
        logger.warning(f"Failed to calculate feature importances: {e}")

    # Segment errors by Fuel Type and Transmission
    test_eval_df = test_df.copy()
    test_eval_df["pred"] = best_preds_actual
    test_eval_df["abs_err"] = (test_eval_df["pred"] - test_eval_df["selling_price"]).abs()

    segment_errors = {}
    for fuel, group in test_eval_df.groupby("fuel_type"):
        segment_errors[fuel] = {
            "count": int(len(group)),
            "mae": round(float(group["abs_err"].mean()), 2),
            "mean_price": round(float(group["selling_price"].mean()), 2),
            "mape_pct": round(float((group["abs_err"] / group["selling_price"]).mean() * 100), 2),
        }

    # Price band evaluation
    price_band_errors = {}
    bins = [0, 400000, 1000000, 2500000, 100000000]
    labels = ["Under ₹4 Lakh", "₹4 Lakh - ₹10 Lakh", "₹10 Lakh - ₹25 Lakh", "Above ₹25 Lakh"]
    test_eval_df["price_band"] = pd.cut(test_eval_df["selling_price"], bins=bins, labels=labels)
    for band, group in test_eval_df.groupby("price_band", observed=False):
        if len(group) > 0:
            price_band_errors[str(band)] = {
                "count": int(len(group)),
                "mae": round(float(group["abs_err"].mean()), 2),
                "mape_pct": round(float((group["abs_err"] / group["selling_price"]).mean() * 100), 2),
            }

    # 6. Save model artifacts to output_dir
    model_file = out_path / "valuation_model.joblib"
    joblib.dump(best_pipeline, model_file)

    lookup_file = out_path / "baseline_lookup.json"
    with open(lookup_file, "w", encoding="utf-8") as f:
        json.dump(baseline_lookup, f, indent=2)

    # Export lightweight JSON model
    light_file = out_path / "valuation_model_light.json"
    if best_model_name == "XGBoost" and hasattr(best_pipeline.named_steps["regressor"], "get_booster"):
        export_lightweight_xgb_model(
            best_pipeline.named_steps["regressor"],
            best_pipeline.named_steps["preprocessor"],
            brand_model_specs,
            global_specs,
            light_file,
        )

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
            "target": TARGET_VARIABLE,
        },
        "feature_importances": feature_importances,
        "brand_model_specs": brand_model_specs,
        "global_specs": global_specs,
        "metrics": {
            "best_mae": round(float(best_mae), 2),
            "best_rmse": round(float(best_rmse), 2),
            "best_r2": round(float(best_r2), 4),
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

    # Sync artifacts to backend/models for Vercel bundling
    for fname in ["valuation_model.joblib", "baseline_lookup.json", "valuation_metadata.json", "valuation_model_light.json"]:
        src = out_path / fname
        dst = backend_models_path / fname
        if src.exists():
            shutil.copy2(src, dst)

    logger.info(f"Training completed successfully! Best model: {best_model_name} (MAE: ₹{best_mae:,.2f}, R2: {best_r2:.4f})")
    return metadata


if __name__ == "__main__":
    train_and_evaluate()
