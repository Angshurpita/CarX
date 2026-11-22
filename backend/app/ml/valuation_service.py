"""Runtime Valuation Inference Service.

Integrates AIEnhancedValuationEngine (Google Gemma / Gemini LLM API + Indian Market Trends)
with baseline lookup tables and trained models (lightweight pure-Python XGBoost and scikit-learn Pipeline),
evaluates input vehicle features on the Cardekho dataset specifications,
and generates bounded fair asking prices and deep market analytics.
"""
from datetime import datetime, timezone
import json
import logging
import math
from pathlib import Path
import re
from typing import Any, Dict, Optional

from backend.app.core.cache import cache
from backend.app.core.config import settings
from backend.app.ml.market_engine import AIEnhancedValuationEngine
from backend.app.schemas.valuation import ValuationRequest, ValuationResponse
from backend.app.services.normalization import infer_body_style, normalize_make, normalize_model

logger = logging.getLogger("carx.ml.service")

NUMERICAL_FEATURES = ["vehicle_age", "km_driven", "mileage", "engine", "max_power", "seats"]
CATEGORICAL_FEATURES = ["brand", "model", "seller_type", "fuel_type", "transmission_type"]


def normalize_brand_name(brand_raw: Optional[str]) -> str:
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


def map_req_to_cardekho_features(req: ValuationRequest, meta_or_light: Dict[str, Any]) -> Dict[str, Any]:
    """Map incoming ValuationRequest fields to Cardekho training features."""
    curr_year = datetime.now().year
    brand_raw = req.brand or req.make or "Maruti"
    brand = normalize_brand_name(brand_raw)

    model_raw = str(req.model or "").strip()
    brand_specs = meta_or_light.get("brand_model_specs", {}).get(brand, {})
    global_specs = meta_or_light.get("global_specs", {
        "mileage": 19.5,
        "engine": 1200.0,
        "max_power": 82.0,
        "seats": 5,
    })

    # Resolve model name to known Cardekho model under this brand if possible
    model = model_raw
    if brand_specs:
        matched = False
        for m in brand_specs.keys():
            if m.lower() == model_raw.lower():
                model = m
                matched = True
                break
        if not matched:
            for m in brand_specs.keys():
                if m.lower() in model_raw.lower() or model_raw.lower() in m.lower():
                    model = m
                    matched = True
                    break

    age = req.vehicle_age if req.vehicle_age is not None else max(0, curr_year - (req.year or (curr_year - 4)))
    km = req.km_driven if req.km_driven is not None else (req.odometer_km or 45000)

    trans_raw = str(req.transmission_type or req.transmission or "Manual").strip().lower()
    trans_type = "Automatic" if ("auto" in trans_raw or "cvt" in trans_raw or "dct" in trans_raw or "amt" in trans_raw) else "Manual"

    seller = req.seller_type or "Individual"
    fuel = (req.fuel_type or "Petrol").strip().title()
    if fuel not in ["Petrol", "Diesel", "CNG", "LPG", "Electric"]:
        fuel = "Petrol"

    # Impute mechanical specs if missing
    defaults = brand_specs.get(model, global_specs)
    mileage = float(req.mileage if req.mileage is not None else defaults.get("mileage", 19.5))
    engine = float(req.engine if req.engine is not None else defaults.get("engine", 1200.0))
    max_power = float(req.max_power if req.max_power is not None else defaults.get("max_power", 82.0))
    seats = int(req.seats if req.seats is not None else defaults.get("seats", 5))

    return {
        "vehicle_age": float(age),
        "km_driven": float(km),
        "mileage": mileage,
        "engine": engine,
        "max_power": max_power,
        "seats": float(seats),
        "brand": brand,
        "model": model,
        "seller_type": seller,
        "fuel_type": fuel,
        "transmission_type": trans_type,
    }


class ValuationService:
    """Singleton service for executing fair price valuations."""

    _instance: Optional["ValuationService"] = None

    def __init__(
        self,
        model_path: str = "models/valuation_model.joblib",
        lookup_path: str = "models/baseline_lookup.json",
        meta_path: str = "models/valuation_metadata.json",
    ):
        self.model_path = Path(model_path)
        self.lookup_path = Path(lookup_path)
        self.meta_path = Path(meta_path)
        self.pipeline = None
        self.light_model: Optional[Dict[str, Any]] = None
        self.baseline_lookup: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self._load_or_train()

    @classmethod
    def get_instance(cls) -> "ValuationService":
        if cls._instance is None:
            cls._instance = cls(
                model_path=settings.resolved_model_path,
                lookup_path=settings.resolved_baseline_lookup_path,
                meta_path=settings.resolved_valuation_meta_path,
            )
        return cls._instance

    def _load_or_train(self):
        """Load artifacts if they exist."""
        # 1. Try loading lightweight pure-Python model first
        candidate_light_paths = [
            self.model_path.parent / "valuation_model_light.json",
            Path("backend/models/valuation_model_light.json"),
            Path("models/valuation_model_light.json"),
        ]
        for p in candidate_light_paths:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        self.light_model = json.load(f)
                    logger.info(f"Loaded lightweight pure-Python valuation engine from {p}.")
                    break
                except Exception as e:
                    logger.warning(f"Could not load light model {p}: {e}")

        # 2. Try loading full scikit-learn / joblib pipeline if available
        if self.light_model is None and self.model_path.exists():
            try:
                import joblib
                self.pipeline = joblib.load(self.model_path)
                logger.info(f"Loaded joblib valuation pipeline from {self.model_path}.")
            except Exception as e:
                logger.warning(f"Failed to load joblib pipeline: {e}")

        # 3. Load baseline lookups and metadata
        candidate_lookups = [
            self.lookup_path,
            Path("backend/models/baseline_lookup.json"),
            Path("models/baseline_lookup.json"),
        ]
        for p in candidate_lookups:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        self.baseline_lookup = json.load(f)
                    break
                except Exception as e:
                    logger.warning(f"Failed to load lookup path {p}: {e}")

        candidate_metas = [
            self.meta_path,
            Path("backend/models/valuation_metadata.json"),
            Path("models/valuation_metadata.json"),
        ]
        for p in candidate_metas:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                    break
                except Exception as e:
                    logger.warning(f"Failed to load metadata {p}: {e}")

    def predict_xgb_price(self, req: ValuationRequest) -> Optional[float]:
        """Execute inference using either pure-Python lightweight trees or XGBoost Pipeline."""
        # 1. Pure-Python inference path (0 external C-dependencies, ultra-fast for Vercel)
        if self.light_model and "trees" in self.light_model:
            try:
                data = map_req_to_cardekho_features(req, self.light_model)
                num_cols = self.light_model.get("num_features", NUMERICAL_FEATURES)
                cat_cols = self.light_model.get("cat_features", CATEGORICAL_FEATURES)

                num_vals = [float(data[col]) for col in num_cols]
                scaler_mean = self.light_model["scaler_mean"]
                scaler_scale = self.light_model["scaler_scale"]
                scaled_num = [(v - m) / s for v, m, s in zip(num_vals, scaler_mean, scaler_scale)]

                one_hot = []
                for feat_name, cats in zip(cat_cols, self.light_model["categories"]):
                    val = str(data.get(feat_name, "")).strip().lower()
                    for c in cats:
                        one_hot.append(1.0 if val == str(c).strip().lower() else 0.0)

                features = scaled_num + one_hot
                base_score = float(self.light_model.get("base_score", 0.5))

                def _eval_node(node):
                    if "leaf" in node:
                        return float(node["leaf"])
                    feat_idx = int(node["split"][1:])
                    val = features[feat_idx]
                    cond = float(node["split_condition"])
                    child_id = node["yes"] if val < cond else node["no"]
                    for child in node.get("children", []):
                        if child["nodeid"] == child_id:
                            return _eval_node(child)
                    return float(node.get("leaf", 0.0))

                tree_sum = sum(_eval_node(t) for t in self.light_model["trees"])
                score = base_score + tree_sum
                val = round(math.expm1(score), -2)
                if not math.isnan(val) and val > 10000:
                    return val
            except Exception as e:
                logger.warning(f"Lightweight tree inference error: {e}")

        # 2. Fallback to joblib pipeline if available
        if self.pipeline is not None:
            try:
                import numpy as np
                import pandas as pd
                data = map_req_to_cardekho_features(req, self.metadata)
                feature_df = pd.DataFrame([data])
                pred_log = self.pipeline.predict(feature_df)
                val = float(np.expm1(pred_log)[0])
                if not np.isnan(val) and val > 10000:
                    return round(val, -2)
            except Exception as e:
                logger.warning(f"XGBoost pipeline prediction failed: {e}")

        # 3. Fallback to baseline lookup if ML prediction not available
        return self.get_baseline_price(req)

    def get_baseline_price(self, req: ValuationRequest) -> float:
        """Lookup hierarchical median baseline price."""
        if self.baseline_lookup:
            brand = normalize_brand_name(req.brand or req.make or "Maruti")
            model = str(req.model or "").strip()
            age = req.vehicle_age if req.vehicle_age is not None else max(0, datetime.now().year - (req.year or 2020))

            k3 = f"{brand}|{model}|{age}"
            if k3 in self.baseline_lookup.get("by_brand_model_age", {}):
                return float(self.baseline_lookup["by_brand_model_age"][k3])

            k2 = f"{brand}|{model}"
            if k2 in self.baseline_lookup.get("by_brand_model", {}):
                base = float(self.baseline_lookup["by_brand_model"][k2])
                return max(50000.0, base * max(0.25, 1.0 - 0.07 * (age - 4)))

            if brand in self.baseline_lookup.get("by_brand", {}):
                base_b = float(self.baseline_lookup["by_brand"][brand])
                return max(50000.0, base_b * max(0.25, 1.0 - 0.07 * (age - 4)))

            return float(self.baseline_lookup.get("global_median", 500000.0))

        return 500000.0

    def estimate(self, req: ValuationRequest) -> ValuationResponse:
        """Estimate statistical fair asking price synchronously using XGBoost Regression."""
        cache_key = cache.generate_key("val", req.model_dump())
        cached_val = cache.get(cache_key)
        if cached_val is not None:
            return cached_val

        xgb_price = self.predict_xgb_price(req)
        response = AIEnhancedValuationEngine.evaluate_sync(req, ml_price=xgb_price)
        selected_algo = self.metadata.get("selected_algorithm", "XGBoost")
        response.prediction_provenance["algorithm"] = selected_algo
        response.prediction_provenance["xgboost_price_inr"] = xgb_price
        response.model_version = self.metadata.get("model_version", "v1.0-xgboost")

        cache.set(cache_key, response, ttl_seconds=3600)
        return response

    async def estimate_async(self, req: ValuationRequest) -> ValuationResponse:
        """Estimate statistical fair asking price asynchronously using XGBoost + AI engine."""
        cache_key = cache.generate_key("val", req.model_dump())
        cached_val = cache.get(cache_key)
        if cached_val is not None:
            return cached_val

        xgb_price = self.predict_xgb_price(req)
        response = await AIEnhancedValuationEngine.evaluate(req, ml_price=xgb_price)
        selected_algo = self.metadata.get("selected_algorithm", "XGBoost")
        response.prediction_provenance["algorithm"] = selected_algo
        response.prediction_provenance["xgboost_price_inr"] = xgb_price
        response.model_version = self.metadata.get("model_version", "v1.0-xgboost")

        cache.set(cache_key, response, ttl_seconds=3600)
        return response
