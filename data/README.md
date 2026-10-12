# CarX Data Directory

This directory stores datasets, ingestion fixtures, and schema definitions for the CarX platform.

## Policy & Ethics
- Never store raw unverified scraping dumps or sensitive user data.
- Public datasets (e.g. licensed automotive datasets) and curated mock test fixtures are stored under `data/sample/`.
- All ingested listing records must clearly identify their provenance (`source_name`, `source_url`, `observation_timestamp`).
