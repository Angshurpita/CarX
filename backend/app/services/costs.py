"""Cross-City Inter-Metro Transport and RTO Transfer Cost Engine for India.

Computes itemized purchase costs including:
- Vehicle carrier transport across Indian metros
- Professional multi-point inspection
- RTO NOC transfer and state re-registration
- Explicit risk flags and unknown cost disclosures
"""
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class ItemizedCostBreakdown:
    origin_city: str
    destination_city: str
    asking_price: float
    transport_cost: float
    inspection_cost: float
    rto_transfer_cost: float
    other_known_costs: float
    estimated_total_purchase_cost: float
    is_interstate: bool
    distance_km: int
    cost_items: List[Dict[str, float]]
    unknown_assumptions: List[str]
    risk_flags: List[str]


# Inter-metro approximate road distances (km)
INTER_METRO_DISTANCES_KM = {
    ("delhi", "mumbai"): 1420,
    ("delhi", "bengaluru"): 2170,
    ("delhi", "kolkata"): 1530,
    ("delhi", "chennai"): 2200,
    ("delhi", "hyderabad"): 1580,
    ("delhi", "pune"): 1430,
    ("delhi", "ahmedabad"): 940,

    ("mumbai", "pune"): 150,
    ("mumbai", "bengaluru"): 980,
    ("mumbai", "hyderabad"): 710,
    ("mumbai", "chennai"): 1330,
    ("mumbai", "kolkata"): 1960,
    ("mumbai", "ahmedabad"): 530,

    ("bengaluru", "chennai"): 350,
    ("bengaluru", "hyderabad"): 570,
    ("bengaluru", "pune"): 840,
    ("bengaluru", "kolkata"): 1870,
    ("bengaluru", "ahmedabad"): 1490,

    ("hyderabad", "chennai"): 630,
    ("hyderabad", "kolkata"): 1490,
    ("hyderabad", "pune"): 560,
    ("hyderabad", "ahmedabad"): 1210,

    ("kolkata", "chennai"): 1660,
    ("kolkata", "pune"): 1820,
    ("kolkata", "ahmedabad"): 2070,

    ("pune", "ahmedabad"): 660,
}


def get_inter_city_distance_km(city1: str, city2: str) -> int:
    c1 = city1.strip().lower()
    c2 = city2.strip().lower()
    if c1 == c2:
        return 0
    if (c1, c2) in INTER_METRO_DISTANCES_KM:
        return INTER_METRO_DISTANCES_KM[(c1, c2)]
    if (c2, c1) in INTER_METRO_DISTANCES_KM:
        return INTER_METRO_DISTANCES_KM[(c2, c1)]
    return 1000  # Default average inter-city distance for unmapped tier-2 pairs


class CrossCityCostService:
    """Calculates all mandatory and estimated out-of-pocket acquisition costs."""

    STANDARD_INSPECTION_FEE = 2500.0  # Certified 150-point pre-purchase inspection

    @classmethod
    def calculate(
        cls,
        asking_price: float,
        origin_city: str,
        origin_state: str,
        destination_city: str,
        destination_state: str,
        vehicle_age_years: int = 3,
        fuel_type: str = "Petrol",
        include_inspection: bool = True,
    ) -> ItemizedCostBreakdown:
        norm_orig = origin_city.strip().title()
        norm_dest = destination_city.strip().title()
        is_same_city = norm_orig.lower() == norm_dest.lower()
        is_interstate = origin_state.strip().lower() != destination_state.strip().lower()

        # 1. Transport Cost
        distance_km = get_inter_city_distance_km(norm_orig, norm_dest)
        if is_same_city:
            transport_cost = 0.0
        else:
            # Base logistics carrier booking + ~₹11 per km flatbed trailer transport
            transport_cost = round(4000.0 + (distance_km * 11.5), -2)

        # 2. Inspection Cost
        inspection_cost = cls.STANDARD_INSPECTION_FEE if include_inspection else 0.0

        # 3. Transfer & RTO Costs
        risk_flags: List[str] = []
        unknown_assumptions: List[str] = []

        if is_same_city or not is_interstate:
            # Intra-state ownership transfer (Form 29 & 30)
            rto_transfer_cost = 2500.0
            rto_note = f"Intra-state ownership transfer within {origin_state}"
        else:
            # Inter-state transfer:
            # Form 28 NOC from source RTO + state re-registration & road tax differential
            base_noc_cost = 3500.0
            # Pro-rata road tax estimate (depreciated vehicle value * ~4-6% residual tax rate)
            tax_rate = 0.05
            if "karnataka" in destination_state.lower():
                tax_rate = 0.07  # Karnataka has higher road tax slabs
                risk_flags.append("Karnataka RTO road tax is among the highest in India (~13-18% lifetime equivalent).")
            elif "delhi" in destination_state.lower() and "diesel" in fuel_type.lower() and vehicle_age_years >= 8:
                risk_flags.append("High risk: Diesel vehicles >10 years are strictly banned from registration/driving in Delhi NCR.")

            pro_rata_road_tax = round(asking_price * tax_rate, -2)
            rto_transfer_cost = base_noc_cost + pro_rata_road_tax
            rto_note = f"Inter-state NOC + estimated re-registration road tax in {destination_state}"
            risk_flags.append(f"Requires physical NOC from {norm_orig} RTO before re-registration.")
            unknown_assumptions.append(
                f"Pro-rata road tax refund from {origin_state} RTO usually takes 6-12 months and is not subtracted from initial purchase outflow."
            )

        other_known_costs = 1200.0  # FASTag re-issuance, mandatory HSRP plates, documentation handling

        total_cost = round(
            asking_price + transport_cost + inspection_cost + rto_transfer_cost + other_known_costs,
            -2,
        )

        cost_items = [
            {"label": "Listing Asking Price", "amount": asking_price, "type": "asking_price"},
            {"label": f"Inter-City Transport ({distance_km} km)", "amount": transport_cost, "type": "transport"},
            {"label": "Certified Pre-Purchase Inspection", "amount": inspection_cost, "type": "inspection"},
            {"label": rto_note, "amount": rto_transfer_cost, "type": "rto_transfer"},
            {"label": "FASTag, HSRP & Admin Charges", "amount": other_known_costs, "type": "admin"},
        ]

        if not is_same_city:
            unknown_assumptions.append(
                f"Carrier transit time estimated at {max(1, distance_km // 400)} to {max(2, distance_km // 300)} business days."
            )

        return ItemizedCostBreakdown(
            origin_city=norm_orig,
            destination_city=norm_dest,
            asking_price=asking_price,
            transport_cost=transport_cost,
            inspection_cost=inspection_cost,
            rto_transfer_cost=rto_transfer_cost,
            other_known_costs=other_known_costs,
            estimated_total_purchase_cost=total_cost,
            is_interstate=is_interstate,
            distance_km=distance_km,
            cost_items=cost_items,
            unknown_assumptions=unknown_assumptions,
            risk_flags=risk_flags,
        )
