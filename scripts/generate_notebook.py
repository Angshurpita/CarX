import json

notebook = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# 🚗 CarX: Machine Learning Valuation Engine & Exploratory Data Analysis\n",
    "### Indian Used-Car Price Prediction, Multi-Algorithm Benchmarking & Model Export\n",
    "\n",
    "**Project:** CarX Valuation Intelligence Platform  \n",
    "**Dataset:** Indian Secondary Auto Market Listings (`data/sample/listings_sample.json`)  \n",
    "**Objective:** Predict statistical fair asking prices in INR (₹) using Gradient Boosted Decision Trees (XGBoost, Gradient Boosting, Random Forest) with stratified evaluation."
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 1. Setup & Environment Dependencies\n",
    "Import essential data science libraries for EDA, preprocessing pipelines, model fitting, and evaluation."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import os\n",
    "import sys\n",
    "import json\n",
    "import math\n",
    "from pathlib import Path\n",
    "from datetime import datetime\n",
    "\n",
    "import numpy as np\n",
    "import pandas as pd\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns\n",
    "\n",
    "from sklearn.model_selection import train_test_split\n",
    "from sklearn.compose import ColumnTransformer\n",
    "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n",
    "from sklearn.pipeline import Pipeline\n",
    "from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor\n",
    "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n",
    "import joblib\n",
    "\n",
    "# Ensure project root is in path\n",
    "root_dir = Path(os.getcwd()).parent if 'notebooks' in os.getcwd() else Path(os.getcwd())\n",
    "sys.path.insert(0, str(root_dir))\n",
    "\n",
    "try:\n",
    "    from xgboost import XGBRegressor\n",
    "    HAS_XGBOOST = True\n",
    "except ImportError:\n",
    "    HAS_XGBOOST = False\n",
    "\n",
    "sns.set_theme(style='whitegrid', palette='muted')\n",
    "plt.rcParams['figure.figsize'] = (10, 5)\n",
    "plt.rcParams['font.size'] = 11\n",
    "print('Libraries loaded successfully!')\n",
    "print(f'XGBoost available: {HAS_XGBOOST}')"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 2. Dataset Loading & Feature Engineering\n",
    "We load verified sample listings and construct domain-specific features:\n",
    "- **`age`**: $current\\_year - manufacturing\\_year$\n",
    "- **`km_per_year`**: $\\frac{odometer\\_km}{age}$ (annual usage intensity)\n",
    "- **`asking_price`**: Target variable in INR (₹)\n",
    "- **Categorical Features**: `make`, `model`, `fuel_type`, `transmission`, `body_style`, `city`"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "from backend.app.ml.training import generate_training_corpus\n",
    "\n",
    "data_path = root_dir / 'data/sample/listings_sample.json'\n",
    "df = generate_training_corpus(str(data_path))\n",
    "print(f'Constructed training corpus with {len(df)} vehicle samples across Indian metro markets.')\n",
    "df.head()"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 3. Exploratory Data Analysis (EDA)\n",
    "Examine summary statistics, missing values, and segment patterns."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print('Summary Statistics:')\n",
    "display(df.describe())\n",
    "\n",
    "print('\\nMissing values:')\n",
    "print(df.isnull().sum())"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### 3.1 Target Variable Distribution (Asking Price in INR)\n",
    "Notice the right-skewness of raw asking prices. In regression, skewed targets lead to oversized gradients on high-value outliers. Modeling on $\\log(1 + \\text{price})$ stabilizes the variance across Luxury Sedans and Budget Hatchbacks."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "fig, axes = plt.subplots(1, 2, figsize=(14, 5))\n",
    "\n",
    "# Raw Price Distribution\n",
    "sns.histplot(df['asking_price'] / 100000, kde=True, ax=axes[0], color='#2563eb')\n",
    "axes[0].set_title('Distribution of Raw Asking Price (₹ Lakhs)')\n",
    "axes[0].set_xlabel('Price (₹ Lakhs)')\n",
    "axes[0].set_ylabel('Frequency')\n",
    "\n",
    "# Log-Transformed Price\n",
    "sns.histplot(np.log1p(df['asking_price']), kde=True, ax=axes[1], color='#16a34a')\n",
    "axes[1].set_title('Distribution of log1p(Asking Price)')\n",
    "axes[1].set_xlabel('log1p(Price)')\n",
    "axes[1].set_ylabel('Frequency')\n",
    "\n",
    "plt.tight_layout()\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### 3.2 Price by Body Style and Fuel Type"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "fig, axes = plt.subplots(1, 2, figsize=(14, 5))\n",
    "\n",
    "sns.boxplot(x='body_style', y=df['asking_price'] / 100000, data=df, ax=axes[0])\n",
    "axes[0].set_title('Asking Price by Body Style (₹ Lakhs)')\n",
    "axes[0].set_xlabel('Body Style')\n",
    "axes[0].set_ylabel('Price (₹ Lakhs)')\n",
    "\n",
    "sns.boxplot(x='fuel_type', y=df['asking_price'] / 100000, data=df, ax=axes[1])\n",
    "axes[1].set_title('Asking Price by Fuel Type (₹ Lakhs)')\n",
    "axes[1].set_xlabel('Fuel Type')\n",
    "axes[1].set_ylabel('Price (₹ Lakhs)')\n",
    "\n",
    "plt.tight_layout()\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### 3.3 Price Depreciation vs. Vehicle Age and Mileage\n",
    "Observe empirical depreciation decay with age and usage intensity:"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "fig, axes = plt.subplots(1, 2, figsize=(14, 5))\n",
    "\n",
    "sns.scatterplot(x='age', y=df['asking_price'] / 100000, hue='body_style', data=df, ax=axes[0], alpha=0.6)\n",
    "axes[0].set_title('Price vs. Vehicle Age (Years)')\n",
    "axes[0].set_xlabel('Age (Years)')\n",
    "axes[0].set_ylabel('Price (₹ Lakhs)')\n",
    "\n",
    "sns.scatterplot(x=df['odometer_km'] / 1000, y=df['asking_price'] / 100000, hue='fuel_type', data=df, ax=axes[1], alpha=0.6)\n",
    "axes[1].set_title('Price vs. Odometer Reading (Thousands of km)')\n",
    "axes[1].set_xlabel(\"Odometer ('000 km)\")\n",
    "axes[1].set_ylabel('Price (₹ Lakhs)')\n",
    "\n",
    "plt.tight_layout()\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 4. Stratified Train/Test Split (Leakage-Resistant)\n",
    "To prevent data leakage and evaluate real generalizability, we split 80% train and 20% test stratified by vehicle `body_style`."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "NUMERICAL_FEATURES = ['age', 'odometer_km', 'owners_count', 'km_per_year']\n",
    "CATEGORICAL_FEATURES = ['make', 'model', 'fuel_type', 'transmission', 'body_style', 'city']\n",
    "\n",
    "train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['body_style'])\n",
    "print(f'Training set records: {len(train_df)}')\n",
    "print(f'Testing set records:  {len(test_df)}')\n",
    "\n",
    "X_train = train_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]\n",
    "y_train = np.log1p(train_df['asking_price'])\n",
    "\n",
    "X_test = test_df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]\n",
    "y_test_actual = test_df['asking_price']"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 5. Preprocessing Pipeline Definition\n",
    "We use a `ColumnTransformer` to standardize numeric features and one-hot encode categorical features."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "preprocessor = ColumnTransformer(\n",
    "    transformers=[\n",
    "        ('num', StandardScaler(), NUMERICAL_FEATURES),\n",
    "        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),\n",
    "    ]\n",
    ")\n",
    "print('Preprocessor pipeline ready.')"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 6. Multi-Model Training & Benchmark Comparison\n",
    "We compare 4 candidate algorithms on the exact same test split:\n",
    "1. **Baseline Median Lookup** (`(make, model, year)` hierarchical table)\n",
    "2. **Random Forest Regressor**\n",
    "3. **Gradient Boosting Regressor**\n",
    "4. **XGBoost Regressor**"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "from backend.app.ml.training import build_baseline_lookup, predict_baseline\n",
    "\n",
    "# 1. Compute baseline median lookup\n",
    "baseline_lookup = build_baseline_lookup(train_df)\n",
    "baseline_preds = test_df.apply(lambda r: predict_baseline(baseline_lookup, r), axis=1)\n",
    "\n",
    "base_mae = mean_absolute_error(y_test_actual, baseline_preds)\n",
    "base_rmse = np.sqrt(mean_squared_error(y_test_actual, baseline_preds))\n",
    "base_r2 = r2_score(y_test_actual, baseline_preds)\n",
    "\n",
    "models = {\n",
    "    'Baseline Median': None,\n",
    "    'Random Forest': RandomForestRegressor(n_estimators=60, max_depth=10, random_state=42),\n",
    "    'Gradient Boosting': GradientBoostingRegressor(n_estimators=80, learning_rate=0.08, max_depth=4, random_state=42),\n",
    "}\n",
    "\n",
    "if HAS_XGBOOST:\n",
    "    models['XGBoost'] = XGBRegressor(\n",
    "        n_estimators=250,\n",
    "        learning_rate=0.05,\n",
    "        max_depth=6,\n",
    "        subsample=0.85,\n",
    "        colsample_bytree=0.85,\n",
    "        reg_alpha=0.05,\n",
    "        reg_lambda=1.0,\n",
    "        random_state=42,\n",
    "        n_jobs=-1,\n",
    "    )\n",
    "\n",
    "results = {\n",
    "    'Baseline Median': {\n",
    "        'MAE (₹)': round(base_mae, 2),\n",
    "        'RMSE (₹)': round(base_rmse, 2),\n",
    "        'R2 Score': round(base_r2, 4),\n",
    "    }\n",
    "}\n",
    "\n",
    "trained_pipelines = {}\n",
    "best_model_name = 'Gradient Boosting'\n",
    "best_mae = float('inf')\n",
    "best_preds = None\n",
    "\n",
    "for name, regressor in models.items():\n",
    "    if regressor is None:\n",
    "        continue\n",
    "    pipe = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', regressor)])\n",
    "    pipe.fit(X_train, y_train)\n",
    "    \n",
    "    preds_log = pipe.predict(X_test)\n",
    "    preds_actual = np.expm1(preds_log)\n",
    "    \n",
    "    mae = mean_absolute_error(y_test_actual, preds_actual)\n",
    "    rmse = np.sqrt(mean_squared_error(y_test_actual, preds_actual))\n",
    "    r2 = r2_score(y_test_actual, preds_actual)\n",
    "    \n",
    "    results[name] = {\n",
    "        'MAE (₹)': round(mae, 2),\n",
    "        'RMSE (₹)': round(rmse, 2),\n",
    "        'R2 Score': round(r2, 4),\n",
    "    }\n",
    "    trained_pipelines[name] = pipe\n",
    "    \n",
    "    if mae < best_mae:\n",
    "        best_mae = mae\n",
    "        best_model_name = name\n",
    "        best_preds = preds_actual\n",
    "\n",
    "results_df = pd.DataFrame(results).T\n",
    "print('Algorithm Comparison Results:')\n",
    "display(results_df)"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### 6.1 Actual vs. Predicted Parity Plot\n",
    "A parity plot visualizes prediction accuracy across the entire valuation spectrum."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "fig, ax = plt.subplots(figsize=(8, 8))\n",
    "\n",
    "ax.scatter(y_test_actual / 100000, best_preds / 100000, alpha=0.45, color='#2563eb', edgecolors='none')\n",
    "lims = [0, max(y_test_actual.max(), best_preds.max()) / 100000 * 1.05]\n",
    "ax.plot(lims, lims, 'r--', alpha=0.8, linewidth=2, label='Ideal 1:1 Parity')\n",
    "\n",
    "ax.set_title(f'Actual vs. Predicted Asking Price ({best_model_name})', fontsize=14)\n",
    "ax.set_xlabel('Actual Asking Price (₹ Lakhs)', fontsize=12)\n",
    "ax.set_ylabel('Predicted Asking Price (₹ Lakhs)', fontsize=12)\n",
    "ax.set_xlim(lims)\n",
    "ax.set_ylim(lims)\n",
    "ax.legend()\n",
    "plt.tight_layout()\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 7. Segment-Level and Price-Band Error Slices\n",
    "Evaluating Mean Absolute Error (MAE) and Mean Absolute Percentage Error (MAPE %) across vehicle body styles."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "test_eval = test_df.copy()\n",
    "test_eval['pred'] = best_preds\n",
    "test_eval['abs_error'] = (test_eval['pred'] - test_eval['asking_price']).abs()\n",
    "test_eval['percentage_error'] = (test_eval['abs_error'] / test_eval['asking_price']) * 100\n",
    "\n",
    "segment_summary = test_eval.groupby('body_style').agg(\n",
    "    Sample_Count=('asking_price', 'count'),\n",
    "    Mean_Price=('asking_price', lambda x: round(x.mean(), 2)),\n",
    "    MAE_INR=('abs_error', lambda x: round(x.mean(), 2)),\n",
    "    MAPE_Pct=('percentage_error', lambda x: round(x.mean(), 2))\n",
    ").reset_index()\n",
    "\n",
    "print('Segment Error Breakdown:')\n",
    "display(segment_summary)"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "---\n",
    "## 8. Exporting Model Artifacts for Web Backend\n",
    "Serialize the trained model pipeline into joblib, lookup tables, and metadata for production consumption."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "out_dir = root_dir / 'models'\n",
    "out_dir.mkdir(parents=True, exist_ok=True)\n",
    "\n",
    "# 1. Save scikit-learn / XGBoost pipeline\n",
    "model_file = out_dir / 'valuation_model.joblib'\n",
    "joblib.dump(trained_pipelines[best_model_name], model_file)\n",
    "print(f'Serialized model pipeline to: {model_file}')\n",
    "\n",
    "# 2. Save baseline lookup table\n",
    "lookup_file = out_dir / 'baseline_lookup.json'\n",
    "with open(lookup_file, 'w', encoding='utf-8') as f:\n",
    "    json.dump(baseline_lookup, f, indent=2)\n",
    "print(f'Serialized baseline lookup to: {lookup_file}')\n",
    "\n",
    "# 3. Save valuation metadata\n",
    "meta_file = out_dir / 'valuation_metadata.json'\n",
    "meta_data = {\n",
    "    'model_version': f'v1.0-{best_model_name.lower().replace(\" \", \"\")}',\n",
    "    'selected_algorithm': best_model_name,\n",
    "    'training_timestamp': datetime.now().isoformat(),\n",
    "    'metrics': results,\n",
    "}\n",
    "with open(meta_file, 'w', encoding='utf-8') as f:\n",
    "    json.dump(meta_data, f, indent=2)\n",
    "print(f'Serialized metadata to: {meta_file}')\n",
    "print('\\nAll training artifacts exported successfully!')"
   ]
  }
 ],
 "metadata": {
  "language_info": {
   "name": "python"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 2
}

with open("notebooks/carx_valuation_model_training.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1)

print("Generated notebooks/carx_valuation_model_training.ipynb successfully!")
