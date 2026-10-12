"""Vehicle Matching Engine for CarX.

Provides canonical variant matching, fuzzy specification normalization,
confidence scoring, and explicit rejection of materially incompatible vehicles.
"""
from dataclasses import dataclass
from enum import Enum
import re
from typing import Optional, Set

from backend.app.schemas.listing import FuelType, NormalizedListing, Transmission
from backend.app.services.normalization import normalize_make, normalize_model


class MatchTier(str, Enum):
    EXACT = "exact"
    EQUIVALENT = "equivalent"
    APPROXIMATE = "approximate"
    INCOMPATIBLE = "incompatible"


@dataclass
class MatchResult:
    is_comparable: bool
    confidence: float
    tier: MatchTier
    explanation: str


# Canonical equivalent variants mapping
EQUIVALENT_VARIANTS_MAP = {
    # Maruti Suzuki
    ("maruti suzuki", "swift", "vxi"): {"vxi", "vxi amt", "vxi ags"},
    ("maruti suzuki", "swift", "zxi"): {"zxi", "zxi amt"},
    ("maruti suzuki", "swift", "zxi+"): {"zxi+", "zxi plus", "zxi+ amt"},
    # Hyundai
    ("hyundai", "creta", "sx"): {"sx", "sx petrol", "sx diesel"},
    ("hyundai", "creta", "sx(o)"): {"sx(o)", "sx opt", "sx optional", "sx(o) at", "sx(o) diesel at"},
    # Honda
    ("honda", "city", "zx"): {"zx", "zx cvt", "zx at"},
    ("honda", "city", "v"): {"v", "v mt", "v cvt"},
    # Tata
    ("tata", "nexon", "xz+"): {"xz+", "xz plus", "xz+ diesel", "xz+ petrol"},
    # Mahindra
    ("mahindra", "xuv700", "ax7"): {"ax7", "ax7 l", "ax7 luxury", "ax7 diesel at"},
    ("mahindra", "thar", "lx"): {"lx", "lx 4x4", "lx 4x4 hard top at"},
    # BMW
    ("bmw", "5 series", "520d"): {"520d", "520d luxury line", "520d m sport"},
    ("bmw", "5 series", "530i"): {"530i", "530i m sport", "530i sport line"},
}


def clean_tokens(text: str) -> Set[str]:
    """Extract alphanumeric words from variant or model string."""
    cleaned = re.sub(r"[^a-zA-Z0-9+]", " ", text.lower())
    return set(cleaned.split())


class VehicleMatcher:
    """Evaluates whether two vehicles are materially comparable for cross-city deals."""

    MIN_COMPARABLE_CONFIDENCE = 0.70

    @classmethod
    def compare(
        cls,
        base_make: str,
        base_model: str,
        base_variant: str,
        base_year: int,
        base_fuel: str,
        base_trans: str,
        target_make: str,
        target_model: str,
        target_variant: str,
        target_year: int,
        target_fuel: str,
        target_trans: str,
    ) -> MatchResult:
        # Step 1: Make & Model compatibility
        norm_b_make = normalize_make(base_make).lower()
        norm_t_make = normalize_make(target_make).lower()
        if norm_b_make != norm_t_make:
            return MatchResult(
                is_comparable=False,
                confidence=0.0,
                tier=MatchTier.INCOMPATIBLE,
                explanation=f"Different manufacturers: '{base_make}' vs '{target_make}'",
            )

        norm_b_model = normalize_model(base_model).lower()
        norm_t_model = normalize_model(target_model).lower()
        if norm_b_model != norm_t_model:
            return MatchResult(
                is_comparable=False,
                confidence=0.0,
                tier=MatchTier.INCOMPATIBLE,
                explanation=f"Different models: '{base_model}' vs '{target_model}'",
            )

        # Step 2: Fuel Type compatibility (Material Difference)
        norm_b_fuel = base_fuel.strip().lower()
        norm_t_fuel = target_fuel.strip().lower()
        if norm_b_fuel != norm_t_fuel:
            return MatchResult(
                is_comparable=False,
                confidence=0.0,
                tier=MatchTier.INCOMPATIBLE,
                explanation=f"Incompatible fuel types: '{base_fuel}' vs '{target_fuel}'",
            )

        # Step 3: Transmission check (MT vs AT)
        is_b_auto = any(k in base_trans.lower() for k in ["auto", "at", "cvt", "dct", "amt", "dsg"])
        is_t_auto = any(k in target_trans.lower() for k in ["auto", "at", "cvt", "dct", "amt", "dsg"])
        trans_penalty = 0.0
        if is_b_auto != is_t_auto:
            # Different transmission is penalized heavily in used-car pricing
            trans_penalty = 0.35

        # Step 4: Year differential
        year_diff = abs(base_year - target_year)
        if year_diff == 0:
            year_score = 1.0
        elif year_diff == 1:
            year_score = 0.95
        elif year_diff == 2:
            year_score = 0.85
        else:
            return MatchResult(
                is_comparable=False,
                confidence=0.40,
                tier=MatchTier.INCOMPATIBLE,
                explanation=f"Manufacturing year difference too wide ({base_year} vs {target_year})",
            )

        # Step 5: Variant matching
        b_var = base_variant.strip().lower()
        t_var = target_variant.strip().lower()

        if b_var == t_var:
            var_score = 1.0
            tier = MatchTier.EXACT
            explanation = "Exact variant match"
        else:
            # Check canonical equivalence table
            equiv_found = False
            for (m_key, mo_key, v_key), syns in EQUIVALENT_VARIANTS_MAP.items():
                if m_key == norm_b_make and mo_key == norm_b_model:
                    if (b_var in syns or any(s in b_var for s in syns)) and (t_var in syns or any(s in t_var for s in syns)):
                        equiv_found = True
                        break

            if equiv_found:
                var_score = 0.95
                tier = MatchTier.EQUIVALENT
                explanation = f"Canonical variant equivalence confirmed ('{base_variant}' ≈ '{target_variant}')"
            else:
                # Token-based Jaccard similarity
                t_base_tokens = clean_tokens(b_var)
                t_target_tokens = clean_tokens(t_var)
                if not t_base_tokens or not t_target_tokens:
                    jaccard = 0.5
                else:
                    intersection = t_base_tokens.intersection(t_target_tokens)
                    union = t_base_tokens.union(t_target_tokens)
                    jaccard = len(intersection) / len(union)

                # Check if conflicting trim levels (e.g. LXI vs ZXI)
                conflicting_trims = [
                    ({"lxi", "xe", "era"}, {"zxi", "zxi+", "xz+", "asta", "zx"}),
                    ({"vxi", "xm"}, {"zxi+", "xz+", "zx"}),
                ]
                has_conflict = False
                for low_set, high_set in conflicting_trims:
                    if (t_base_tokens.intersection(low_set) and t_target_tokens.intersection(high_set)) or (
                        t_base_tokens.intersection(high_set) and t_target_tokens.intersection(low_set)
                    ):
                        has_conflict = True
                        break

                if has_conflict:
                    return MatchResult(
                        is_comparable=False,
                        confidence=0.30,
                        tier=MatchTier.INCOMPATIBLE,
                        explanation=f"Materially different trim tiers: '{base_variant}' vs '{target_variant}'",
                    )

                var_score = 0.60 + 0.35 * jaccard
                tier = MatchTier.APPROXIMATE
                explanation = f"Approximate variant match ('{base_variant}' ~ '{target_variant}')"

        final_confidence = round(var_score * year_score * (1.0 - trans_penalty), 2)
        is_comp = final_confidence >= cls.MIN_COMPARABLE_CONFIDENCE

        if not is_comp and tier != MatchTier.INCOMPATIBLE:
            tier = MatchTier.INCOMPATIBLE
            explanation += f"; aggregate confidence ({final_confidence}) below comparability threshold ({cls.MIN_COMPARABLE_CONFIDENCE})"

        return MatchResult(
            is_comparable=is_comp,
            confidence=final_confidence,
            tier=tier,
            explanation=explanation,
        )

    @classmethod
    def compare_listings(cls, l1: NormalizedListing, l2: NormalizedListing) -> MatchResult:
        """Compare two full normalized listings."""
        return cls.compare(
            base_make=l1.make,
            base_model=l1.model,
            base_variant=l1.variant,
            base_year=l1.year,
            base_fuel=l1.fuel_type.value,
            base_trans=l1.transmission.value,
            target_make=l2.make,
            target_model=l2.model,
            target_variant=l2.variant,
            target_year=l2.year,
            target_fuel=l2.fuel_type.value,
            target_trans=l2.transmission.value,
        )
