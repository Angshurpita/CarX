# CarX REST API Documentation (v1)

Base URL: `/api/v1`

## Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health status, database ping, and model load state |
| `GET` | `/cars/meta` | Makes, models, body styles, and cities available in the index |
| `GET` | `/cars/search` | Paginated listing search with full filtering options |
| `GET` | `/listings/{listing_id}` | Detailed listing view with history, valuation, and provenance |
| `POST` | `/valuation/estimate` | Run ML valuation for arbitrary vehicle specs |
| `POST` | `/deals/compare` | Cross-city deal comparison including transport and RTO costs |
| `POST` | `/deals/search` | Ranked deal discovery sorted by valuation discount |
| `POST` | `/assistant/chat` | Conversational assistant with tool invocation loop |

## Request / Response Schemas

### 1. Valuation Estimate (`POST /api/v1/valuation/estimate`)
**Request:**
```json
{
  "make": "Hyundai",
  "model": "Creta",
  "variant": "SX",
  "year": 2021,
  "odometer_km": 42000,
  "fuel_type": "Diesel",
  "transmission": "Manual",
  "owners_count": 1,
  "city": "Mumbai"
}
```

**Response:**
```json
{
  "estimated_fair_price": 1285000.0,
  "price_range_low": 1210000.0,
  "price_range_high": 1360000.0,
  "model_version": "v1.0-gbdt",
  "confidence_score": 0.88,
  "baseline_price": 1290000.0,
  "currency": "INR",
  "notes": "Model predicts typical asking price central tendency. Inspection recommended."
}
```

### 2. Cross-City Deal Compare (`POST /api/v1/deals/compare`)
**Request:**
```json
{
  "buyer_city": "Mumbai",
  "make": "Honda",
  "model": "City",
  "year_min": 2019,
  "year_max": 2022,
  "compare_cities": ["Delhi", "Bengaluru", "Mumbai"]
}
```

**Response:**
```json
{
  "buyer_city": "Mumbai",
  "candidates": [
    {
      "listing_id": "dl-city-01",
      "city": "Delhi",
      "make": "Honda",
      "model": "City",
      "variant": "ZX CVT",
      "year": 2020,
      "asking_price": 950000.0,
      "estimated_fair_price": 1020000.0,
      "price_difference": -70000.0,
      "transport_cost": 22000.0,
      "inspection_cost": 2500.0,
      "rto_transfer_cost": 28000.0,
      "estimated_total_purchase_cost": 1002500.0,
      "net_benefit_vs_local": 47500.0,
      "risk_flags": ["Inter-state NOC required", "Re-registration needed in MH"]
    }
  ]
}
```
