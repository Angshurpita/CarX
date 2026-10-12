# CarX Conversational AI Assistant (Gemma via OpenRouter)

## 1. Overview

CarX embeds an intelligent automotive advisor powered by Google's **Gemma** open models running securely through the OpenRouter API.
The assistant translates free-form natural language queries into validated backend actions, grounded in real search results and deterministic calculations.

## 2. Server-Side Tool Execution Architecture

To prevent hallucinations, arithmetic errors, and security vulnerabilities:
1. **The LLM never performs price calculations**: All prices, depreciation adjustments, and cross-city transport costs are computed by Python service modules.
2. **Untrusted User/Listing Text Isolation**: Listing descriptions and user inputs are treated as untrusted strings. Instructions embedded within them are ignored.
3. **No Direct Database Access**: The LLM interacts strictly through defined, validated schemas.

### Tool Registry

1. **`search_cars`**
   - Filters listings by budget, make, model, fuel type, transmission, year, and city.
   - Returns paginated list of validated vehicle cards.
2. **`get_listing_details`**
   - Retrieves complete specification, history, and known risk flags for a specific listing ID.
3. **`estimate_fair_price`**
   - Invokes the ML valuation engine to compute statistical fair market value and confidence range.
4. **`compare_city_deals`**
   - Evaluates a target vehicle across two or more Indian cities, computing transport, NOC, and RTO re-registration costs.
5. **`calculate_purchase_cost`**
   - Breaks down out-of-pocket acquisition costs including asking price, inter-city transport, inspection fee, and transfer duties.
6. **`get_listing_price_history`**
   - Returns historical price movements for a listing over time.

## 3. Configuration & Resiliency

- **Model**: Configured via `OPENROUTER_MODEL` (e.g., `google/gemma-2-9b-it:free` or `google/gemma-2-27b-it`).
- **Resilience**: Timeout limits (default 30s), max 5 iterative tool calls per query, fallback to friendly explanation on OpenRouter provider unavailability or quota exhaustion.
