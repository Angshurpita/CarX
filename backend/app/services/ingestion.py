"""Data Ingestion layer for CarX.

Supports pluggable providers (Partner APIs, Sample Dataset, CSV upload)
with validation, deduplication, price change tracking, and provenance retention.
"""
from abc import ABC, abstractmethod
import csv
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from pydantic import ValidationError

from backend.app.schemas.listing import (
    IngestionReport,
    NormalizedListing,
    RawListingInput,
)
from backend.app.services.normalization import normalize_listing_record

logger = logging.getLogger("carx.ingestion")


class BaseDataProvider(ABC):
    """Abstract interface for authorized CarX listing data providers."""

    @abstractmethod
    def provider_name(self) -> str:
        """Unique provider identifier."""
        pass

    @abstractmethod
    def fetch_raw_listings(self) -> List[RawListingInput]:
        """Fetch raw listings from the source."""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Verify provider availability."""
        pass


class SampleDataProvider(BaseDataProvider):
    """Provider reading verified sample/demonstration listings from local JSON."""

    def __init__(self, file_path: str = "data/sample/listings_sample.json"):
        self.file_path = Path(file_path)

    def provider_name(self) -> str:
        return "sample_verified_demo"

    def health_check(self) -> bool:
        return self.file_path.exists()

    def fetch_raw_listings(self) -> List[RawListingInput]:
        if not self.file_path.exists():
            logger.warning(f"Sample data file {self.file_path} not found.")
            return []

        with open(self.file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        raw_records: List[RawListingInput] = []
        for item in data:
            item["provider_name"] = item.get("provider_name", self.provider_name())
            item["is_demo"] = True
            try:
                raw_records.append(RawListingInput(**item))
            except ValidationError as e:
                logger.error(f"Sample listing failed validation: {e}")
        return raw_records


class CsvDataProvider(BaseDataProvider):
    """Provider for authorized dealer/fleet CSV feed imports."""

    def __init__(self, file_path: str, provider_name: str = "dealer_csv_feed"):
        self.file_path = Path(file_path)
        self._provider_name = provider_name

    def provider_name(self) -> str:
        return self._provider_name

    def health_check(self) -> bool:
        return self.file_path.exists()

    def fetch_raw_listings(self) -> List[RawListingInput]:
        if not self.file_path.exists():
            return []

        raw_records: List[RawListingInput] = []
        with open(self.file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                try:
                    payload = {
                        "provider_name": self._provider_name,
                        "source_listing_id": row.get("id") or row.get("source_listing_id") or f"csv_{idx}",
                        "source_url": row.get("source_url") or f"https://dealers.carx.in/listing/{idx}",
                        "make": row.get("make", ""),
                        "model": row.get("model", ""),
                        "variant": row.get("variant", "Standard"),
                        "year": int(row.get("year", 2020)),
                        "asking_price": float(row.get("asking_price") or row.get("price", 0)),
                        "currency": row.get("currency", "INR"),
                        "odometer_km": int(row.get("odometer_km") or row.get("kms", 0)),
                        "fuel_type": row.get("fuel_type", "Petrol"),
                        "transmission": row.get("transmission", "Manual"),
                        "owners_count": int(row.get("owners_count") or row.get("owners", 1)),
                        "city": row.get("city", "Delhi"),
                        "state": row.get("state"),
                        "body_style": row.get("body_style"),
                        "seller_type": row.get("seller_type", "dealer"),
                        "is_demo": False,
                    }
                    raw_records.append(RawListingInput(**payload))
                except Exception as exc:
                    logger.warning(f"CSV row {idx} malformed: {exc}")
        return raw_records


class IngestionCoordinator:
    """Manages ingestion batches, deduplication, price revision logging, and normalization."""

    def __init__(self):
        # In-memory storage for rapid verification / testing before DB phase
        self._store: Dict[str, NormalizedListing] = {}
        # Stores price history: listing_key -> list of (price, timestamp)
        self._price_history: Dict[str, List[Tuple[float, datetime]]] = {}

    def get_all_listings(self) -> List[NormalizedListing]:
        return list(self._store.values())

    def get_listing_by_id(self, listing_id: str) -> Optional[NormalizedListing]:
        return self._store.get(listing_id)

    def get_price_history(self, listing_id: str) -> List[Tuple[float, datetime]]:
        return self._price_history.get(listing_id, [])

    def ingest_batch(self, raw_records: List[RawListingInput], provider_name: str) -> IngestionReport:
        total_received = len(raw_records)
        total_ingested = 0
        duplicates_detected = 0
        price_updates = 0
        errors: List[Dict[str, Any]] = []

        for record in raw_records:
            try:
                normalized = normalize_listing_record(record)
                key = f"{normalized.provider_name}:{normalized.source_listing_id}"

                if key in self._store:
                    duplicates_detected += 1
                    existing = self._store[key]
                    # Update observation timestamp
                    existing.last_observed_at = datetime.now(timezone.utc)

                    # Check for price revision
                    if abs(existing.asking_price - normalized.asking_price) > 1.0:
                        price_updates += 1
                        # Record old price in history
                        if key not in self._price_history:
                            self._price_history[key] = [(existing.asking_price, existing.first_observed_at)]
                        self._price_history[key].append((normalized.asking_price, datetime.now(timezone.utc)))
                        existing.asking_price = normalized.asking_price
                else:
                    self._store[key] = normalized
                    total_ingested += 1
                    # Initialize price history
                    self._price_history[key] = [(normalized.asking_price, normalized.first_observed_at)]

            except Exception as e:
                errors.append({
                    "source_id": getattr(record, "source_listing_id", "unknown"),
                    "error": str(e),
                })

        return IngestionReport(
            provider_name=provider_name,
            total_received=total_received,
            total_ingested=total_ingested,
            duplicates_detected=duplicates_detected,
            price_updates=price_updates,
            errors=errors,
        )
