"""Deal Discovery and Cross-City Deal Intelligence Service.

Combines vehicle matching, ML fair-price estimation, inter-city logistics arithmetic,
and multi-factor risk assessment to identify genuinely attractive vehicle listings.
"""
from datetime import datetime
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.ml.valuation_service import ValuationService
from backend.app.models.listing import ListingModel
from backend.app.schemas.deals import (
    DealCompareCandidate,
    DealCompareRequest,
    DealCompareResponse,
    DealSearchRequest,
)
from backend.app.schemas.listing import INDIAN_CITY_STATE_MAP
from backend.app.schemas.valuation import ValuationRequest
from backend.app.services.costs import CrossCityCostService
from backend.app.services.matching import MatchTier, VehicleMatcher
from backend.app.services.normalization import normalize_city_state

logger = logging.getLogger("carx.services.deals")


class DealDiscoveryService:
    """Evaluates cross-city used-car listings and scores deal attractiveness."""

    @classmethod
    def compare_cross_city(cls, db: Session, req: DealCompareRequest) -> DealCompareResponse:
        buyer_city, buyer_state = normalize_city_state(req.buyer_city)

        # Query listings matching make and model
        query = db.query(ListingModel).filter(
            ListingModel.listing_status == "active",
            ListingModel.make.ilike(f"%{req.make.strip()}%"),
            ListingModel.model.ilike(f"%{req.model.strip()}%"),
        )

        if req.fuel_type:
            query = query.filter(ListingModel.fuel_type.ilike(f"%{req.fuel_type.strip()}%"))
        if req.transmission:
            query = query.filter(ListingModel.transmission.ilike(f"%{req.transmission.strip()}%"))
        if req.year_min:
            query = query.filter(ListingModel.year >= req.year_min)
        if req.year_max:
            query = query.filter(ListingModel.year <= req.year_max)

        listings = query.all()

        val_service = ValuationService.get_instance()
        candidates: List[DealCompareCandidate] = []
        current_year = datetime.now().year

        # Target specs for vehicle matching comparison
        target_variant = req.variant or "Standard"
        target_year = req.year_max or (current_year - 3)

        for l in listings:
            # Step 1: Vehicle Matching
            if req.variant or req.fuel_type or req.transmission:
                match_res = VehicleMatcher.compare(
                    base_make=req.make,
                    base_model=req.model,
                    base_variant=target_variant,
                    base_year=target_year,
                    base_fuel=req.fuel_type or l.fuel_type,
                    base_trans=req.transmission or l.transmission,
                    target_make=l.make,
                    target_model=l.model,
                    target_variant=l.variant,
                    target_year=l.year,
                    target_fuel=l.fuel_type,
                    target_trans=l.transmission,
                )
                if not match_res.is_comparable:
                    continue
                match_conf = match_res.confidence
                match_tier_val = match_res.tier.value
            else:
                match_conf = 1.0
                match_tier_val = MatchTier.EXACT.value

            # Step 2: Fair-price valuation in listing's origin city
            val_req = ValuationRequest(
                make=l.make,
                model=l.model,
                variant=l.variant,
                year=l.year,
                odometer_km=l.odometer_km,
                fuel_type=l.fuel_type,
                transmission=l.transmission,
                owners_count=l.owners_count,
                city=l.city,
                body_style=l.body_style,
            )
            val_res = val_service.estimate(val_req)
            fair_price = val_res.estimated_fair_price

            price_diff = round(l.asking_price - fair_price, -2)
            discount_pct = round(((fair_price - l.asking_price) / fair_price) * 100, 1)

            # Step 3: Landed purchase cost to buyer_city
            cost_res = CrossCityCostService.calculate(
                asking_price=l.asking_price,
                origin_city=l.city,
                origin_state=l.state,
                destination_city=buyer_city,
                destination_state=buyer_state,
                vehicle_age_years=max(1, current_year - l.year),
                fuel_type=l.fuel_type,
            )

            # Step 4: Multi-factor Deal Scoring (0 - 100)
            score = 50.0
            reasons: List[str] = []
            risk_flags = list(cost_res.risk_flags)

            # A. Discount component (capped between -20 and +25)
            discount_contrib = max(-25.0, min(25.0, discount_pct * 1.5))
            score += discount_contrib
            if discount_pct > 3.0:
                reasons.append(f"Asking price is ₹{abs(int(price_diff)):,} ({discount_pct}%) below estimated fair market value.")
            elif discount_pct < -5.0:
                risk_flags.append(f"Asking price is ₹{abs(int(price_diff)):,} above typical market asking price.")

            # Extreme discount flag (potential salvage or hidden defect)
            if discount_pct > 25.0:
                risk_flags.append("Unusually high discount (>25% below market): Comprehensive accidental inspection strongly advised.")

            # B. Mileage sanity
            age = max(1, current_year - l.year)
            km_per_year = l.odometer_km / age
            if 7000 <= km_per_year <= 16000:
                score += 8.0
                reasons.append(f"Healthy average running ({int(km_per_year):,} km/year).")
            elif km_per_year > 22000:
                score -= 10.0
                risk_flags.append(f"High annual running ({int(km_per_year):,} km/year): Inspect suspension, tyres and clutch.")
            elif km_per_year < 3000 and age >= 3:
                risk_flags.append("Suspiciously low odometer reading: Check authorized service records to verify authenticity.")

            # C. Ownership count
            if l.owners_count == 1:
                score += 8.0
                reasons.append("Single owner vehicle (desirable for resale value).")
            elif l.owners_count >= 3:
                score -= 12.0
                risk_flags.append(f"Multiple previous owners ({l.owners_count} owners).")

            # D. Geography & Inter-state convenience
            if cost_res.origin_city.lower() == buyer_city.lower():
                score += 8.0
                reasons.append("Local vehicle: Zero inter-city transport charges and simple intra-state name transfer.")
            else:
                score -= 4.0
                reasons.append(f"Inter-city candidate: Landed transport ({cost_res.distance_km} km) is ₹{int(cost_res.transport_cost):,}.")

            final_score = round(max(10.0, min(96.0, score)), 1)

            # Verdict
            if final_score >= 72:
                verdict = "Attractive Deal"
            elif final_score >= 52:
                verdict = "Fair Market Price"
            else:
                verdict = "Premium Priced"

            candidates.append(
                DealCompareCandidate(
                    listing_id=l.id,
                    make=l.make,
                    model=l.model,
                    variant=l.variant,
                    year=l.year,
                    odometer_km=l.odometer_km,
                    fuel_type=l.fuel_type,
                    transmission=l.transmission,
                    city=l.city,
                    state=l.state,
                    asking_price=l.asking_price,
                    estimated_fair_price=fair_price,
                    price_difference=price_diff,
                    discount_pct=discount_pct,
                    match_confidence=match_conf,
                    match_tier=match_tier_val,
                    distance_km=cost_res.distance_km,
                    transport_cost=cost_res.transport_cost,
                    inspection_cost=cost_res.inspection_cost,
                    rto_transfer_cost=cost_res.rto_transfer_cost,
                    estimated_total_purchase_cost=cost_res.estimated_total_purchase_cost,
                    deal_score=final_score,
                    deal_verdict=verdict,
                    recommendation_reasons=reasons,
                    risk_flags=risk_flags,
                    cost_breakdown=cost_res.cost_items,
                    source_url=l.source_url,
                )
            )

        # Sort by deal score descending
        candidates.sort(key=lambda c: c.deal_score, reverse=True)

        # Compute net benefit vs lowest local candidate
        local_candidates = [c for c in candidates if c.city.lower() == buyer_city.lower()]
        lowest_local_cost = min((c.estimated_total_purchase_cost for c in local_candidates), default=None)

        if lowest_local_cost:
            for c in candidates:
                if c.city.lower() != buyer_city.lower():
                    benefit = round(lowest_local_cost - c.estimated_total_purchase_cost, -2)
                    c.net_benefit_vs_local = benefit

        best_id = candidates[0].listing_id if candidates else None

        return DealCompareResponse(
            buyer_city=buyer_city,
            total_candidates=len(candidates),
            best_deal_listing_id=best_id,
            candidates=candidates,
        )

    @classmethod
    def search_deals(cls, db: Session, req: DealSearchRequest) -> DealCompareResponse:
        """Search top deals across the entire catalog."""
        compare_req = DealCompareRequest(
            buyer_city=req.buyer_city or "Delhi",
            make=req.make or "",
            model=req.model or "",
        )
        resp = cls.compare_cross_city(db, compare_req)

        # Apply optional filters
        filtered = resp.candidates
        if req.max_budget:
            filtered = [c for c in filtered if c.estimated_total_purchase_cost <= req.max_budget]
        if req.min_discount_pct is not None:
            filtered = [c for c in filtered if c.discount_pct >= req.min_discount_pct]
        if req.city:
            filtered = [c for c in filtered if c.city.lower() == req.city.strip().lower()]

        resp.candidates = filtered[: req.page_size]
        resp.total_candidates = len(filtered)
        resp.best_deal_listing_id = filtered[0].listing_id if filtered else None
        return resp
