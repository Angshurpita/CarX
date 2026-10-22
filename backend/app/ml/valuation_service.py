"""Runtime Valuation Inference Service.

Integrates AIEnhancedValuationEngine (Google Gemma / Gemini LLM API + Indian Market Trends)
with baseline lookup tables and trained models, evaluates input vehicle features,
and generates bounded fair asking prices and deep market analytics.
"""
from datetime import datetime, timezone
import json
import logging
import math
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import joblib
    import numpy as np
    import pandas as pd
except ImportError:
    joblib = None
    np = None
    pd = None

from backend.app.core.cache import cache
from backend.app.core.config import settings
from backend.app.ml.market_engine import AIEnhancedValuationEngine
from backend.app.schemas.valuation import ValuationRequest, ValuationResponse
from backend.app.services.normalization import infer_body_style, normalize_make, normalize_model

logger = logging.getLogger("carx.ml.service")


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
        """Load artifacts if they exist, otherwise trigger pipeline training."""
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
                    logger.info("Successfully loaded lightweight pure-Python valuation engine.")
                    break
                except Exception as e:
                    logger.warning(f"Could not load light model {p}: {e}")

        # 2. Try loading full scikit-learn / joblib pipeline if available
        if self.light_model is None and joblib is not None and self.model_path.exists():
            try:
                self.pipeline = joblib.load(self.model_path)
                logger.info("Loaded joblib valuation pipeline.")
            except Exception as e:
                logger.warning(f"Failed to load joblib pipeline: {e}")

        # 3. Load baseline lookups and metadata
        if self.lookup_path.exists():
            try:
                with open(self.lookup_path, "r", encoding="utf-8") as f:
                    self.baseline_lookup = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load lookup path: {e}")

        if self.meta_path.exists():
            try:
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load metadata: {e}")

    def predict_xgb_price(self, req: ValuationRequest) -> Optional[float]:
        """Execute inference using either pure-Python lightweight trees or XGBoost Pipeline."""
        norm_make = normalize_make(req.make)
        norm_model = normalize_model(req.model)
        body_style = infer_body_style(norm_model, req.body_style).value
        current_year = datetime.now().year
        age = max(1, current_year - req.year)
        km_per_year = float(req.odometer_km) / max(1, age)

        # Pure-Python inference path (0 dependencies, ultra-fast)
        if self.light_model:
            try:
                num_vals = [
                    float(age),
                    float(req.odometer_km),
                    float(req.owners_count if req.owners_count is not None else 1),
                    float(km_per_year),
                ]
                scaler_mean = self.light_model["scaler_mean"]
                scaler_scale = self.light_model["scaler_scale"]
                scaled_num = [(v - m) / s for v, m, s in zip(num_vals, scaler_mean, scaler_scale)]

                input_dict = {
                    "make": norm_make,
                    "model": norm_model,
                    "fuel_type": req.fuel_type,
                    "transmission": req.transmission,
                    "body_style": body_style,
                    "city": req.city,
                }
                one_hot = []
                for feat_name, cats in zip(self.light_model["cat_features"], self.light_model["categories"]):
                    val = input_dict.get(feat_name, "")
                    for c in cats:
                        one_hot.append(1.0 if val == c else 0.0)

                features = scaled_num + one_hot
                base_score = self.light_model["base_score"]

                def _eval_node(node):
                    if "leaf" in node:
                        return float(node["leaf"])
                    feat_idx = int(node["split"][1:])
                    val = features[feat_idx]
                    cond = float(node["split_condition"])
                    child_id = node["yes"] if val < cond else node["no"]
                    for child in node["children"]:
                        if child["nodeid"] == child_id:
                            return _eval_node(child)
                    return float(node.get("leaf", 0.0))

                score = base_score + sum(_eval_node(t) for t in self.light_model["trees"])
                val = round(math.expm1(score), -2)
                if math.isnan(val) or val <= 0:
                    return None
                return val
            except Exception as e:
                logger.warning(f"Lightweight tree inference error: {e}")

        # Fallback to joblib pipeline if available
        if self.pipeline is not None and pd is not None and np is not None:
            try:
                feature_df = pd.DataFrame([{
                    "age": age,
                    "odometer_km": float(req.odometer_km),
                    "owners_count": int(req.owners_count or 1),
                    "km_per_year": km_per_year,
                    "make": norm_make,
                    "model": norm_model,
                    "fuel_type": req.fuel_type,
                    "transmission": req.transmission,
                    "body_style": body_style,
                    "city": req.city,
                }])
                pred_log = self.pipeline.predict(feature_df)
                val = float(np.expm1(pred_log)[0])
                if np.isnan(val) or val <= 0:
                    return None
                return round(val, -2)
            except Exception as e:
                logger.warning(f"XGBoost pipeline prediction failed: {e}")

        return None

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
