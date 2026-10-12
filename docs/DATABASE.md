# CarX Database Design & Migrations

## 1. Schema Overview

CarX uses SQLAlchemy 2.0 ORM with Alembic for database migrations. It is configured to run seamlessly against local SQLite for zero-setup local development/testing, and PostgreSQL in staging and production.

### Core Tables

1. **`providers`**
   - `id` (UUID/Integer PK)
   - `name` (String, unique)
   - `provider_type` (Enum: partner_api, direct_feed, csv_upload, demo)
   - `is_active` (Boolean)
   - `created_at`, `updated_at` (DateTime)

2. **`canonical_vehicles`**
   - `id` (PK)
   - `make` (String, indexed)
   - `model` (String, indexed)
   - `variant` (String, indexed)
   - `generation` (String, nullable)
   - `body_style` (Enum: Hatchback, Sedan, SUV, MUV, Luxury)
   - `standard_fuel` (Enum)
   - `standard_transmission` (Enum)
   - `engine_cc` (Integer, nullable)
   - `created_at` (DateTime)

3. **`listings`**
   - `id` (PK, UUID or auto-incrementing integer)
   - `provider_id` (FK -> providers.id)
   - `source_listing_id` (String, indexed)
   - `source_url` (String)
   - `canonical_vehicle_id` (FK -> canonical_vehicles.id, nullable)
   - `make`, `model`, `variant` (String, normalized)
   - `year` (Integer, indexed)
   - `asking_price` (Float, indexed)
   - `currency` (String, default 'INR')
   - `odometer_km` (Integer)
   - `fuel_type` (String)
   - `transmission` (String)
   - `owners_count` (Integer)
   - `city` (String, indexed)
   - `state` (String)
   - `seller_type` (Enum: dealer, individual, certified_dealer)
   - `listing_status` (Enum: active, sold, expired, stale)
   - `is_demo` (Boolean, default False)
   - `match_confidence` (Float, 0.0 to 1.0)
   - `first_observed_at` (DateTime)
   - `last_observed_at` (DateTime)
   - `raw_data` (JSON)

4. **`listing_price_history`**
   - `id` (PK)
   - `listing_id` (FK -> listings.id)
   - `price` (Float)
   - `observed_at` (DateTime)

5. **`valuation_snapshots`**
   - `id` (PK)
   - `listing_id` (FK -> listings.id, nullable)
   - `model_version` (String)
   - `estimated_fair_price` (Float)
   - `lower_bound` (Float)
   - `upper_bound` (Float)
   - `difference_amount` (Float)
   - `difference_percentage` (Float)
   - `created_at` (DateTime)

6. **`saved_searches`**
   - `id` (PK)
   - `query_params` (JSON)
   - `notification_email` (String, nullable)
   - `created_at` (DateTime)

## 2. Migration Commands

```bash
# Generate a new migration
alembic revision --autogenerate -m "create_initial_carx_tables"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```
