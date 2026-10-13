"""High-Performance In-Memory TTL Cache for CarX.

Provides sub-millisecond query caching for search results, metadata facets,
valuation predictions, and city deal comparisons.
"""
from datetime import datetime, timezone
import hashlib
import json
import logging
from threading import Lock
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("carx.cache")


class FastCache:
    """Thread-safe in-memory LRU/TTL cache."""

    def __init__(self, max_size: int = 5000):
        self.max_size = max_size
        self._store: Dict[str, Tuple[Any, float]] = {}  # key -> (data, expire_at_timestamp)
        self._lock = Lock()
        self.hits = 0
        self.misses = 0

    @staticmethod
    def generate_key(prefix: str, payload: Any) -> str:
        """Create a deterministic hash key from prefix and arguments."""
        if isinstance(payload, dict):
            raw = json.dumps(payload, sort_keys=True, default=str)
        else:
            raw = str(payload)
        h = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
        return f"{prefix}:{h}"

    def get(self, key: str) -> Optional[Any]:
        now = datetime.now(timezone.utc).timestamp()
        with self._lock:
            if key in self._store:
                data, expire_at = self._store[key]
                if now < expire_at:
                    self.hits += 1
                    return data
                else:
                    # Expired
                    del self._store[key]
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        expire_at = datetime.now(timezone.utc).timestamp() + ttl_seconds
        with self._lock:
            if len(self._store) >= self.max_size:
                # Evict oldest entry
                oldest_key = next(iter(self._store))
                del self._store[oldest_key]
            self._store[key] = (value, expire_at)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self.hits + self.misses
            hit_ratio = round(self.hits / total, 3) if total > 0 else 0.0
            return {
                "size": len(self._store),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio": hit_ratio,
            }


# Singleton cache instance
cache = FastCache()
