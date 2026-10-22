from fastapi import APIRouter
from backend.app.ml.valuation_service import ValuationService
from backend.app.schemas.valuation import ValuationRequest, ValuationResponse

router = APIRouter()


@router.post("/valuation/estimate", response_model=ValuationResponse)
async def estimate_fair_price(payload: ValuationRequest):
    """Estimate a vehicle's statistical fair asking price using the CarX valuation model."""
    service = ValuationService.get_instance()
    return await service.estimate_async(payload)

