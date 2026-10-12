# CarX Model Artifacts Directory

This directory stores trained model artifacts, baseline lookups, and evaluation metric metadata.

## Artifacts
- `valuation_model.joblib`: Serialized machine learning pipeline (StandardScaler, OneHotEncoder / TargetEncoder, CatBoost / XGBoost / GradientBoostingRegressor).
- `baseline_lookup.json`: Median price baseline lookup table grouped by `(make, model, year)`.
- `valuation_metadata.json`: Provenance information including training timestamp, dataset size, split method (chronological/group), MAE, RMSE, and segment-level errors.

Binary model files are excluded from git via `.gitignore`.
