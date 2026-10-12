from fastapi import APIRouter
from backend.app.api.v1.endpoints import listings, valuation

api_router = APIRouter()
api_router.include_router(listings.router, tags=["listings"])
api_router.include_router(valuation.router, tags=["valuation"])
