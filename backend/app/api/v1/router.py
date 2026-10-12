from fastapi import APIRouter
from backend.app.api.v1.endpoints import assistant, deals, listings, saved_searches, valuation

api_router = APIRouter()
api_router.include_router(listings.router, tags=["listings"])
api_router.include_router(valuation.router, tags=["valuation"])
api_router.include_router(deals.router, tags=["deals"])
api_router.include_router(assistant.router, tags=["assistant"])
api_router.include_router(saved_searches.router, tags=["saved_searches"])
