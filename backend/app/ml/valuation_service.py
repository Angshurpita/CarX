"""Runtime Valuation Inference Service.

Integrates AIEnhancedValuationEngine (Google Gemma / Gemini LLM API + Indian Market Trends)
with baseline lookup tables and trained models, evaluates input vehicle features,
and generates bounded fair asking prices and deep market analytics.
"""
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional
import joblib
import numpy as np
import pandas as pd

from backend.app.core.cache import cache
from backend.app.core.config import settings
from backend.app.ml.market_engine import AIEnhancedValuationEngine
from backend.app.ml.training import (
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    predict_baseline,
    train_and_evaluate,
)
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
        if not self.model_path.exists() or not self.lookup_path.exists():
            logger.info("Valuation artifacts not found. Initiating automated training...")
            meta = train_and_evaluate(
                sample_path=settings.resolved_sample_data_path,
                output_dir=str(self.model_path.parent),
            )
            self.metadata = meta

        try:
            self.pipeline = joblib.load(self.model_path)
            with open(self.lookup_path, "r", encoding="utf-8") as f:
                self.baseline_lookup = json.load(f)
            if self.meta_path.exists():
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            logger.info("Successfully loaded valuation pipeline and baseline lookups.")
        except Exception as e:
            logger.error(f"Failed to load valuation model: {e}")

    def predict_xgb_price(self, req: ValuationRequest) -> Optional[float]:
        """Execute inference using the trained XGBoost Pipeline."""
        if self.pipeline is None:
            return None
        try:
            norm_make = normalize_make(req.make)
            norm_model = normalize_model(req.model)
            body_style = infer_body_style(norm_model, req.body_style).value
            current_year = datetime.now().year
            age = max(1, current_year - req.year)
            km_per_year = float(req.odometer_km) / max(1, age)

            feature_df = pd.DataFrame([{
                "age": age,
                "odometer_km": float(req.odometer_km),
                "owners_count": int(req.owners_count),
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
