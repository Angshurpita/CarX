# CarX Machine Learning Valuation Engine

## 1. Objective and Honest Positioning

The CarX Valuation Engine estimates a vehicle's **fair asking price** based on statistical market trends in the Indian used-car sector.
- **Statistical Estimate, Not Final Deal Guarantee**: The model predicts typical market asking valuations. Actual closing transaction prices may vary based on subjective inspection findings, negotiation skills, tyre/battery conditions, and documentation status.
- **No Claims of Guarantees**: We do not claim any vehicle is guaranteed accident-free or an infallible bargain without physical certified inspections.

## 2. Feature Engineering Pipeline

### Input Features:
1. `make`: Categorical (e.g. Maruti Suzuki, Hyundai, Honda, Tata, Mahindra)
2. `model`: Categorical (e.g. Swift, Creta, City, Nexon, XUV700)
3. `variant`: Categorical (e.g. VXI, ZXI, SX, ZX, Titanium)
4. `age`: Numeric (`current_year - manufacturing_year`)
5. `odometer_km`: Numeric with log-transform and clipping
6. `fuel_type`: Categorical (Petrol, Diesel, CNG, Electric)
7. `transmission`: Categorical (Manual, Automatic, DCT, CVT, AMT)
8. `owners_count`: Numeric (1, 2, 3+)
9. `city`: Categorical (Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad)
10. `body_style`: Categorical (Hatchback, Sedan, SUV, MUV)
11. `metro_tier`: Categorical (Tier-1, Tier-2)

### Target Variable:
- `asking_price` (in INR ₹). Modeled on log-scale `log1p(price)` to stabilize variance and prevent exponential skew in luxury segments, then transformed back for reporting.

## 3. Modeling Strategy

1. **Baseline Model**:
   - Median price lookup grouped by `(make, model, age_bucket)`.
   - Fallback to segment/make median when low sample counts exist.
2. **Machine Learning Pipeline**:
   - Preprocessing: `ColumnTransformer` with `StandardScaler` on numerical features, `OneHotEncoder(handle_unknown='ignore')` or `TargetEncoder` on categorical features.
   - Algorithms evaluated:
     - `GradientBoostingRegressor` (scikit-learn)
     - `RandomForestRegressor` (scikit-learn)
     - `XGBoostRegressor`
3. **Validation Strategy**:
   - Chronological split (listings ordered by observation date) or leakage-resistant GroupKFold by vehicle family to prevent overfitting on identical listings.
4. **Evaluation Metrics**:
   - **MAE** (Mean Absolute Error in ₹)
   - **RMSE** (Root Mean Squared Error in ₹)
   - **MAPE** (Mean Absolute Percentage Error %)
   - **$R^2$ Score** (Supplementary goodness-of-fit indicator)
   - Segment-level error reporting (Hatchbacks vs Mid-size SUVs vs Luxury Sedans).
