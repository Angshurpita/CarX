# CarX Data Sources & Acquisition Policy

## 1. Ethical Data Ingestion Policy

CarX strictly adheres to ethical data acquisition standards:
- **No Unauthorized Scraping**: We do not bypass CAPTCHAs, rate limits, or anti-bot protections of third-party platforms (e.g. CarWale, Spinny, Cars24).
- **Authorized Providers**: Data ingestion accepts feeds via:
  1. Authorized partner REST APIs.
  2. Licensed automotive data providers.
  3. Direct dealer bulk inventory CSV/JSON uploads.
  4. Curated, publicly licensed automotive market datasets.
- **Demonstration Data**: For local testing and development where live partner APIs are unconfigured, CarX provides a high-fidelity synthetic/sample Indian used-car dataset under `data/sample/listings_sample.json`. Demonstration data is explicitly labeled as `is_demo: true` and never passed off as verified real-time inventory.

## 2. Ingestion Pipeline Schema

Every ingested record passes through `BaseListingIngestionSchema`:

| Field | Type | Description |
|---|---|---|
| `provider_name` | string | Originating feed or dealer identifier |
| `source_listing_id`| string | Unique identifier in provider's system |
| `source_url` | string | Canonical source URL for provenance |
| `observed_at` | datetime | Timestamp when listing was extracted |
| `asking_price` | float | Price in INR (₹) |
| `make` | string | Vehicle manufacturer (e.g., Maruti Suzuki, Hyundai) |
| `model` | string | Model name (e.g., Swift, Creta, City) |
| `variant` | string | Trim/Variant (e.g., VXI, SX(O), ZX) |
| `year` | integer | Year of manufacture |
| `odometer_km` | integer | Total kilometers driven |
| `fuel_type` | enum | Petrol, Diesel, CNG, Electric, Hybrid |
| `transmission` | enum | Manual, Automatic, AMT, CVT, DCT |
| `owners` | integer | Number of previous owners (1, 2, 3+) |
| `city` | string | Registered location (e.g., Mumbai, Delhi, Bengaluru) |
| `state` | string | Indian state or UT (e.g., Maharashtra, Delhi) |
| `is_verified` | boolean | Whether independent documentation was checked |
| `raw_payload` | JSON | Preserved original provider payload for audit |

## 3. Deduplication and Freshness

- Duplicate detection compares `(provider_name, source_listing_id)` as well as a composite fingerprint `(make, model, year, city, odometer_km, asking_price)`.
- If an existing active listing is re-observed at a different price, a price history snapshot is recorded in `listing_price_history` and the current asking price is updated.
- Listings older than 45 days without re-observation are automatically marked as `status = "stale"`.
