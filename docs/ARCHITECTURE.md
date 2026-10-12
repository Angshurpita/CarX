# CarX System Architecture & Design

## 1. Executive Overview

**CarX** is an AI-powered used-car valuation, search, and cross-city deal intelligence platform for the Indian automotive market.
The platform enables Indian car buyers to:
1. Search and filter used vehicles with natural language and structured filters.
2. Estimate statistical **fair asking prices** using calibrated ML pipelines (distinguishing model predictions from actual observed asking prices).
3. Compare equivalent vehicles across Indian cities with itemized cross-city purchase cost arithmetic (transport, inspection, RTO/transfer, road taxes).
4. Discover deals with explicit vehicle-matching scores, comparability checks, and transparent risk flags.
5. Interact with a **Gemma-powered conversational AI assistant** via OpenRouter that uses server-side validated tools without hallucinated listings or ungrounded arithmetic.

---

## 2. Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 CARX CLIENT                                     |
|  Next.js 14 / TypeScript / Tailwind-Free Modular UI / Real-time Assistant Chat  |
+---------------------------------------------------------------------------------+
                                      |  HTTPS / REST / JSON
                                      v
+---------------------------------------------------------------------------------+
|                             CARX FASTAPI BACKEND                                |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                              API Routers                                  |  |
|  |  /cars  •  /listings  •  /valuation  •  /deals  •  /assistant  •  /health |  |
|  +---------------------------------------------------------------------------+  |
|                                     |                                           |
|  +---------------------------------------------------------------------------+  |
|  |                             Service Layer                                 |  |
|  |  • SearchService       • ValuationService    • CrossCityCostService       |  |
|  |  • VehicleMatcher      • DealRankingService  • AssistantToolExecutor      |  |
|  +---------------------------------------------------------------------------+  |
|            |                      |                      |                      |
|            v                      v                      v                      v
|   +-----------------+    +-----------------+    +-----------------+    +-------------+
|   |   Data Access   |    |   ML Valuation  |    | Cross-City Cost |    | OpenRouter  |
|   |   SQLAlchemy 2  |    | XGBoost / GBDT  |    |  Inter-city RTO |    |   Gemma     |
|   | SQLite / Postgres|   | Baseline Median |    |  Transport Matrix|   | Tool calling|
|   +-----------------+    +-----------------+    +-----------------+    +-------------+
|            |                                                                    |
|            v                                                                    |
|   +-------------------------------------------------------+                     |
|   |                    Relational DB                      |                     |
|   |  canonical_vehicles  •  listings  •  price_history    |                     |
|   |  providers  •  valuation_snapshots  •  saved_searches |                     |
|   +-------------------------------------------------------+                     |
+---------------------------------------------------------------------------------+
```

---

## 3. Core Component Boundaries

### 3.1 Data Ingestion & Normalization (`backend/app/services/ingestion.py`)
- Ingests data through an extensible `BaseDataProvider` interface.
- Stores raw metadata alongside normalized vehicle fields (fuel type, transmission, body style, state, city, RTO codes).
- Performs deduplication (matching provider ID, URL, VIN/Reg if available, or tuple of attributes).
- Flags stale listings and preserves audit trails.

### 3.2 Vehicle Matching Engine (`backend/app/services/matching.py`)
- Normalizes Indian vehicle nomenclature (e.g., Maruti Suzuki Swift VXI vs Swift ZXI, Hyundai Creta SX vs SX(O)).
- Computes matching confidence (1.0 = exact canonical variant; 0.85 = trim equivalent; <0.70 = rejected/unreliable for cross-city comparisons).

### 3.3 Valuation Engine (`backend/app/ml/`)
- Dual-tier estimator:
  - Baseline: Median price of comparable segment/make/model/year.
  - ML Pipeline: Scikit-learn + XGBoost / Gradient Boosting Regressor trained on chronological splits.
- Provenance tracking: Model version, training data timestamp, MAE, RMSE, and uncertainty band (90% prediction interval).
- Explicit disclaimer: Fair asking price estimates reflect statistical market central tendency, not guaranteed transaction prices.

### 3.4 Cross-City Cost Engine (`backend/app/services/costs.py`)
- Computes:
  $$\text{Total Purchase Cost} = \text{Asking Price} + \text{Transport Cost} + \text{Inspection Cost} + \text{RTO Transfer / Re-registration} + \text{Taxes / Other}$$
- Inter-city road/carrier distance matrix across major Indian metros (Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad, etc.).
- Never silently treats unknown costs as zero; explicit cost breakdown with known vs estimated flags.

### 3.5 Deal Discovery Engine (`backend/app/services/deals.py`)
- Evaluates:
  $$\text{Price Difference} = \text{Asking Price} - \text{Estimated Fair Price}$$
- Deal Score balances discount against mileage anomaly, age, ownership count, and data completeness.
- Flags suspicious deals (e.g., price > 40% below fair market value requires physical inspection / salvage check).

### 3.6 AI Assistant Integration (`backend/app/ai/`)
- Powered by Google Gemma via OpenRouter API.
- Implements strict function-calling schemas with server-side tool execution.
- LLM cannot execute raw SQL or hallucinate prices/listings. All calculations are executed deterministically in Python.
