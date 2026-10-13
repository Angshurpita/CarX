from fastapi import APIRouter
from backend.app.api.v1.endpoints import assistant, deals, listings, saved_searches, valuation
from backend.app.core.cache import cache

api_router = APIRouter()
api_router.include_router(listings.router, tags=["listings"])
api_router.include_router(valuation.router, tags=["valuation"])
api_router.include_router(deals.router, tags=["deals"])
api_router.include_router(assistant.router, tags=["assistant"])
api_router.include_router(saved_searches.router, tags=["saved_searches"])


@api_router.get("/cache/stats", tags=["system"])
def get_cache_statistics():
    """Retrieve in-memory query cache statistics and hit ratio."""
    return cache.stats()
