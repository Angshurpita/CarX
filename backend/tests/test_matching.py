from backend.app.services.matching import MatchTier, VehicleMatcher


def test_exact_variant_match():
    res = VehicleMatcher.compare(
        base_make="Maruti Suzuki",
        base_model="Swift",
        base_variant="VXI",
        base_year=2020,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Maruti Suzuki",
        target_model="Swift",
        target_variant="VXI",
        target_year=2020,
        target_fuel="Petrol",
        target_trans="Manual",
    )
    assert res.is_comparable is True
    assert res.confidence == 1.0
    assert res.tier == MatchTier.EXACT


def test_equivalent_variant_match():
    res = VehicleMatcher.compare(
        base_make="Hyundai",
        base_model="Creta",
        base_variant="SX(O)",
        base_year=2021,
        base_fuel="Diesel",
        base_trans="Automatic",
        target_make="Hyundai",
        target_model="Creta",
        target_variant="SX Opt",
        target_year=2021,
        target_fuel="Diesel",
        target_trans="Automatic",
    )
    assert res.is_comparable is True
    assert res.confidence >= 0.90
    assert res.tier == MatchTier.EQUIVALENT


def test_incompatible_different_makes():
    res = VehicleMatcher.compare(
        base_make="Maruti Suzuki",
        base_model="Swift",
        base_variant="VXI",
        base_year=2020,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Hyundai",
        target_model="i20",
        target_variant="Asta",
        target_year=2020,
        target_fuel="Petrol",
        target_trans="Manual",
    )
    assert res.is_comparable is False
    assert res.confidence == 0.0
    assert res.tier == MatchTier.INCOMPATIBLE


def test_incompatible_fuel_types():
    res = VehicleMatcher.compare(
        base_make="Hyundai",
        base_model="Creta",
        base_variant="SX",
        base_year=2021,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Hyundai",
        target_model="Creta",
        target_variant="SX",
        target_year=2021,
        target_fuel="Diesel",  # Material difference: Petrol vs Diesel
        target_trans="Manual",
    )
    assert res.is_comparable is False
    assert res.confidence == 0.0
    assert res.tier == MatchTier.INCOMPATIBLE


def test_incompatible_conflicting_trims():
    # Base LXI vs Top ZXI+
    res = VehicleMatcher.compare(
        base_make="Maruti Suzuki",
        base_model="Swift",
        base_variant="LXI",
        base_year=2020,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Maruti Suzuki",
        target_model="Swift",
        target_variant="ZXI+",
        target_year=2020,
        target_fuel="Petrol",
        target_trans="Manual",
    )
    assert res.is_comparable is False
    assert res.confidence <= 0.40
    assert res.tier == MatchTier.INCOMPATIBLE


def test_transmission_penalty():
    res = VehicleMatcher.compare(
        base_make="Honda",
        base_model="City",
        base_variant="V",
        base_year=2020,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Honda",
        target_model="City",
        target_variant="V",
        target_year=2020,
        target_fuel="Petrol",
        target_trans="CVT",  # Manual vs CVT
    )
    # Transmission difference is heavily penalized
    assert res.is_comparable is False or res.confidence < 0.70


def test_year_gap_handling():
    # Gap of 1 year is fine
    res1 = VehicleMatcher.compare(
        base_make="Maruti Suzuki",
        base_model="Swift",
        base_variant="VXI",
        base_year=2020,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Maruti Suzuki",
        target_model="Swift",
        target_variant="VXI",
        target_year=2021,
        target_fuel="Petrol",
        target_trans="Manual",
    )
    assert res1.is_comparable is True
    assert res1.confidence >= 0.90

    # Gap of 4 years is incompatible
    res4 = VehicleMatcher.compare(
        base_make="Maruti Suzuki",
        base_model="Swift",
        base_variant="VXI",
        base_year=2018,
        base_fuel="Petrol",
        base_trans="Manual",
        target_make="Maruti Suzuki",
        target_model="Swift",
        target_variant="VXI",
        target_year=2023,
        target_fuel="Petrol",
        target_trans="Manual",
    )
    assert res4.is_comparable is False
    assert res4.tier == MatchTier.INCOMPATIBLE
