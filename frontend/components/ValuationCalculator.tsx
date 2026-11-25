"use client";

import React, { useState } from "react";
import { estimateFairPrice, ValuationResponse } from "../lib/api";
import { formatINR } from "./ListingCard";
import {
  ALL_BRANDS,
  POPULAR_BRANDS,
  MANUFACTURING_YEARS,
  getModelsForBrand,
  getCarSpecDefaults,
} from "../lib/carData";

export default function ValuationCalculator() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [odometer, setOdometer] = useState<number | "">("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [owners, setOwners] = useState<number | "">("");
  const [city, setCity] = useState("");

  // Cardekho Supervised Continuous Regression Mechanical & Seller Attributes
  const [sellerType, setSellerType] = useState("Individual");
  const [mileage, setMileage] = useState<number | "">("");
  const [engine, setEngine] = useState<number | "">("");
  const [maxPower, setMaxPower] = useState<number | "">("");
  const [seats, setSeats] = useState<number | "">(5);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [activeMethodologyTab, setActiveMethodologyTab] = useState<"problem" | "concepts" | "stack" | "workflow" | "features">("problem");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [error, setError] = useState("");

  const handleMakeChange = (newMake: string) => {
    setMake(newMake);
    setModel("");
    setMileage("");
    setEngine("");
    setMaxPower("");
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    if (make && newModel) {
      const specs = getCarSpecDefaults(make, newModel);
      setMileage(specs.mileage);
      setEngine(specs.engine);
      setMaxPower(specs.max_power);
      setSeats(specs.seats);
    }
  };

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!make || !model || !year || !odometer || !fuel || !transmission || !owners || !city) {
      setError("Please select all vehicle parameters to compute fair market valuation.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await estimateFairPrice({
        make,
        model,
        variant,
        year: Number(year),
        odometer_km: Number(odometer),
        fuel_type: fuel,
        transmission,
        owners_count: Number(owners),
        city,
        // Cardekho Continuous Regression Features
        brand: make,
        car_name: `${make} ${model} ${variant}`.trim(),
        seller_type: sellerType,
        transmission_type: transmission,
        vehicle_age: Math.max(0, 2026 - Number(year)),
        km_driven: Number(odometer),
        mileage: mileage !== "" ? Number(mileage) : undefined,
        engine: engine !== "" ? Number(engine) : undefined,
        max_power: maxPower !== "" ? Number(maxPower) : undefined,
        seats: seats !== "" ? Number(seats) : 5,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Valuation calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const makeSlug = (make || "").toLowerCase().replace(/ /g, "-");
  const modelSlug = (model || "").toLowerCase().replace(/ /g, "-");
  const citySlug = (city || "").toLowerCase();

  return (
    <div style={{ maxWidth: "1060px", margin: "0 auto 60px auto" }}>
      {/* Liquid Glass Header Banner */}
      <div className="section-feature-banner">
        <div className="banner-grid">
          <div className="banner-content">
            <span className="hero-pill" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--liquid-blue)", display: "inline-block", boxShadow: "0 0 6px var(--liquid-blue)" }} />
              XGBoost Regression & AI Market Valuation Engine
            </span>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: "8px", lineHeight: 1.2 }}>
              Automotive Fair-Price & Trend Predictor
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "12px", lineHeight: 1.6 }}>
              Powered by high-performance <strong>XGBoost Regression</strong> combined with calibrated Indian used-car depreciation curves, metro-specific RTO taxes, and secondary market benchmarks.
            </p>
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="liquid-btn-secondary"
                style={{ fontSize: "0.82rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => setShowMethodology(!showMethodology)}
              >
                <span>📘 {showMethodology ? "Hide Architecture & 5-Section Guide" : "View ML Architecture & Methodology Guide (5 Sections)"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showMethodology ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </div>
          </div>
          <div className="banner-image-wrapper">
            <img
              src="/assets/calculator_analytics.jpg"
              alt="Automotive Valuation Analytics Graph"
              className="banner-custom-image"
            />
            <div className="banner-image-overlay" />
          </div>
        </div>
      </div>

      {/* Interactive 5-Section Methodology & Instructions Accordion */}
      {showMethodology && (
        <div className="glass-panel" style={{ padding: "28px", marginBottom: "30px", border: "1px solid rgba(37, 99, 235, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
              Automotive Used Car Price Prediction: Technical Specifications
            </h3>
            <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "12px", background: "rgba(37, 99, 235, 0.08)", color: "var(--liquid-blue)", fontWeight: 700 }}>
              XGBoost Supervised Continuous Regression
            </span>
          </div>

          {/* Section Nav Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid var(--border-glass)", paddingBottom: "12px", marginBottom: "18px" }}>
            <button
              type="button"
              className={activeMethodologyTab === "problem" ? "liquid-btn-primary" : "liquid-btn-secondary"}
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => setActiveMethodologyTab("problem")}
            >
              1. Problem Definition
            </button>
            <button
              type="button"
              className={activeMethodologyTab === "concepts" ? "liquid-btn-primary" : "liquid-btn-secondary"}
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => setActiveMethodologyTab("concepts")}
            >
              2. Concepts Used
            </button>
            <button
              type="button"
              className={activeMethodologyTab === "stack" ? "liquid-btn-primary" : "liquid-btn-secondary"}
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => setActiveMethodologyTab("stack")}
            >
              3. Tech Stack Used
            </button>
            <button
              type="button"
              className={activeMethodologyTab === "workflow" ? "liquid-btn-primary" : "liquid-btn-secondary"}
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => setActiveMethodologyTab("workflow")}
            >
              4. Implementation Workflow
            </button>
            <button
              type="button"
              className={activeMethodologyTab === "features" ? "liquid-btn-primary" : "liquid-btn-secondary"}
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => setActiveMethodologyTab("features")}
            >
              5. Data Description (Features)
            </button>
          </div>

          {/* Tab 1: Problem Definition */}
          {activeMethodologyTab === "problem" && (
            <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-muted)" }}>
              <h4 style={{ color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" }}>
                1. Problem Definition
              </h4>
              <p>
                The <strong>Used Car Price Prediction</strong> task is a <strong>supervised continuous regression problem</strong> aimed at predicting the fair market value (<code>selling_price</code> in INR ₹) of a used automobile in India based on its physical attributes, usage history, and mechanical specifications.
              </p>
              <p style={{ marginTop: "10px" }}>
                Because the used car market is fragmented and pricing fluctuates based on brand equity, vehicle age, engine capacity, and fuel efficiency, individual sellers and dealerships lack a standardized, data-driven pricing benchmark.
              </p>
              <p style={{ marginTop: "10px" }}>
                The objective is to construct an end-to-end predictive machine learning model using <strong>XGBoost Regression</strong> to automatically estimate selling prices, preventing prolonged listing times from overpricing or financial losses from underpricing.
              </p>
            </div>
          )}

          {/* Tab 2: Concepts Used */}
          {activeMethodologyTab === "concepts" && (
            <div style={{ fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-muted)" }}>
              <h4 style={{ color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" }}>
                2. Concepts Used
              </h4>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li><strong>Supervised Continuous Regression:</strong> Modeling non-linear relationships between vehicle attributes and a continuous monetary output (<code>selling_price</code>).</li>
                <li><strong>Gradient Boosted Decision Trees (XGBoost):</strong> Utilizing extreme gradient boosting to fit an ensemble of decision trees optimized via second-order Taylor expansion of the loss function.</li>
                <li><strong>Exploratory Data Analysis (EDA):</strong> Profiling distributions, detecting outliers, analyzing multi-collinearity, and examining pricing relationships across brand equity, mileage, and engine specs.</li>
                <li><strong>Data Preprocessing & Feature Engineering:</strong> Parsing string numeric representations (e.g., stripping units from mileage, engine, and max_power), encoding high-cardinality nominal categories (car_name, brand, model), and handling missing values.</li>
                <li><strong>Regression Metrics Evaluation:</strong> Assessing model performance via Root Mean Squared Error (RMSE) to penalize large errors, Mean Absolute Error (MAE) for average currency error, and R² Score to quantify explained variance.</li>
                <li><strong>Model Explainability & Inference Pipeline:</strong> Extracting tree-based feature importances to interpret pricing drivers and building an end-to-end inference function for real-time car price estimation.</li>
              </ul>
            </div>
          )}

          {/* Tab 3: Tech Stack */}
          {activeMethodologyTab === "stack" && (
            <div style={{ fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-muted)" }}>
              <h4 style={{ color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" }}>
                3. Tech Stack Used
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "10px" }}>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>Core Language</div>
                  <div>Python 3.10+ / 3.12 (Vercel runtime)</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>Data Manipulation & Analysis</div>
                  <div><code>pandas</code>, <code>numpy</code></div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>Data Visualization</div>
                  <div><code>matplotlib</code>, <code>seaborn</code></div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>Machine Learning Frameworks</div>
                  <div><code>xgboost (XGBRegressor)</code>, <code>scikit-learn (train_test_split, StandardScaler, OneHotEncoder, MAE, MSE, RMSE, R²)</code></div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>Development Environment</div>
                  <div>Jupyter Notebook / Google Colab / FastAPI Web Service</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Implementation Workflow */}
          {activeMethodologyTab === "workflow" && (
            <div style={{ fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-muted)" }}>
              <h4 style={{ color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" }}>
                4. Implementation Workflow
              </h4>
              <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li><strong>Import Necessary Libraries:</strong> Load modules for numerical processing (pandas, numpy), visual analytics (matplotlib, seaborn), modeling (XGBRegressor, RandomForestRegressor), and evaluation metrics (scikit-learn).</li>
                <li><strong>Import the Dataset:</strong> Read the used car dataset containing categorical details (car_name, brand, model, seller_type, fuel_type, transmission_type), continuous features (vehicle_age, mileage, engine, max_power, seats), and the target variable (selling_price).</li>
                <li><strong>Exploratory Data Analysis (EDA):</strong> Inspect data types, summary statistics, missing values, and target variable distribution. Visualize relationships between selling_price and key numerical/categorical predictors (e.g., vehicle_age vs. price decay, brand equity, max_power impact).</li>
                <li><strong>Data Preprocessing and Feature Engineering:</strong> Clean string-formatted numerical columns (extracting numeric values from text containing units like cc, bhp, or kmpl). Handle missing values across mechanical attributes (mileage, engine, max_power, seats). Apply categorical encoding (e.g., One-Hot Encoding for seller_type, fuel_type, transmission_type and Target/Ordinal Encoding for high-cardinality brand and model fields). Perform train-test splitting and feature scaling.</li>
                <li><strong>Model Development:</strong> Instantiate and train the XGBRegressor on the processed training set. Tune hyperparameters (n_estimators, max_depth, learning_rate, subsample, colsample_bytree) using cross-validation to maximize predictive accuracy. Evaluate performance on unseen test data using RMSE, MAE, and R² Score.</li>
                <li><strong>Model Explainability:</strong> Extract feature importances from the trained tree model to determine top pricing factors (e.g., max_power, vehicle_age, engine, brand).</li>
                <li><strong>Inference Pipeline: Price Prediction for Sample Cars:</strong> Build a clean, reusable inference function that receives raw vehicle attributes, applies data cleaning and transformation steps, and outputs estimated selling prices for sample used cars in real-time.</li>
              </ol>
            </div>
          )}

          {/* Tab 5: Data Description */}
          {activeMethodologyTab === "features" && (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <h4 style={{ color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" }}>
                5. Data Description (Feature Information)
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid var(--border-glass)" }}>
                      <th style={{ padding: "8px 12px", color: "var(--text-main)" }}>Feature Name</th>
                      <th style={{ padding: "8px 12px", color: "var(--text-main)" }}>Data Type</th>
                      <th style={{ padding: "8px 12px", color: "var(--text-main)" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>car_name</code></td>
                      <td style={{ padding: "8px 12px" }}>String</td>
                      <td style={{ padding: "8px 12px" }}>Car's Full name, which includes brand and specific model name.</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>brand</code></td>
                      <td style={{ padding: "8px 12px" }}>Categorical</td>
                      <td style={{ padding: "8px 12px" }}>Brand Name of the particular car.</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>model</code></td>
                      <td style={{ padding: "8px 12px" }}>Categorical</td>
                      <td style={{ padding: "8px 12px" }}>Exact model name of the car of a particular brand.</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>seller_type</code></td>
                      <td style={{ padding: "8px 12px" }}>Categorical</td>
                      <td style={{ padding: "8px 12px" }}>Which Type of seller is selling the used car (Individual, Dealer, Trustmark Dealer).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>fuel_type</code></td>
                      <td style={{ padding: "8px 12px" }}>Categorical</td>
                      <td style={{ padding: "8px 12px" }}>Fuel used in the used car, which was put up on sale (Petrol, Diesel, CNG, Electric).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>transmission_type</code></td>
                      <td style={{ padding: "8px 12px" }}>Categorical</td>
                      <td style={{ padding: "8px 12px" }}>Transmission used in the used car, which was put on sale (Manual, Automatic).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>vehicle_age</code></td>
                      <td style={{ padding: "8px 12px" }}>Continuous / Integer</td>
                      <td style={{ padding: "8px 12px" }}>The count of years since car was bought (2026 - Manufacturing Year).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>mileage</code></td>
                      <td style={{ padding: "8px 12px" }}>Continuous / Float</td>
                      <td style={{ padding: "8px 12px" }}>It is the number of kilometer the car runs per litre (kmpl).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>engine</code></td>
                      <td style={{ padding: "8px 12px" }}>Continuous / Float</td>
                      <td style={{ padding: "8px 12px" }}>It is the engine capacity in cc (cubic centimeters).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>max_power</code></td>
                      <td style={{ padding: "8px 12px" }}>Continuous / Float</td>
                      <td style={{ padding: "8px 12px" }}>Max power it produces in BHP (Brake Horsepower).</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "8px 12px" }}><code>seats</code></td>
                      <td style={{ padding: "8px 12px" }}>Integer</td>
                      <td style={{ padding: "8px 12px" }}>Total number of seats in car.</td>
                    </tr>
                    <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                      <td style={{ padding: "8px 12px" }}><strong><code>selling_price</code></strong></td>
                      <td style={{ padding: "8px 12px" }}><strong>Continuous Target</strong></td>
                      <td style={{ padding: "8px 12px" }}><strong>The sale price which was put up on website (continuous regression target in INR ₹).</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Calculator Form in Liquid Glass */}
      <div className="glass-panel" style={{ padding: "36px" }}>
        <form onSubmit={handleEstimate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px", marginBottom: "32px" }}>
          <div>
            <label className="filter-label">Make / Manufacturer (brand)</label>
            <select id="val-make" className="filter-select" value={make} onChange={(e) => handleMakeChange(e.target.value)} required>
              <option value="">Select Make</option>
              <optgroup label="Popular Brands">
                {POPULAR_BRANDS.map((m) => (
                  <option key={`pop-${m}`} value={m}>{m}</option>
                ))}
              </optgroup>
              <optgroup label="All Brands (A-Z)">
                {ALL_BRANDS.map((m) => (
                  <option key={`all-${m}`} value={m}>{m}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="filter-label">Model Line (model)</label>
            <select id="val-model" className="filter-select" value={model} onChange={(e) => handleModelChange(e.target.value)} disabled={!make} required>
              <option value="">{make ? "Select Model" : "Select Make First"}</option>
              {getModelsForBrand(make).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="filter-label">Trim / Variant (car_name suffix)</label>
            <input id="val-variant" className="filter-input" type="text" placeholder="Enter trim or variant (e.g. LX, VXI, Titanium)" value={variant} onChange={(e) => setVariant(e.target.value)} />
          </div>

          <div>
            <label className="filter-label">Manufacturing Year (vehicle_age)</label>
            <select id="val-year" className="filter-select" value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} required>
              <option value="">Select Year (1997 - 2026)</option>
              {MANUFACTURING_YEARS.map((y) => (
                <option key={y} value={y}>{y} (Age: {2026 - y} yrs)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="filter-label">Odometer Reading (km_driven)</label>
            <input id="val-odometer" className="filter-input" type="number" min="1000" max="300000" step="1000" placeholder="e.g. 35000" value={odometer} onChange={(e) => setOdometer(e.target.value ? Number(e.target.value) : "")} required />
          </div>

          <div>
            <label className="filter-label">Fuel Type (fuel_type)</label>
            <select id="val-fuel" className="filter-select" value={fuel} onChange={(e) => setFuel(e.target.value)} required>
              <option value="">Select Fuel</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
            </select>
          </div>

          <div>
            <label className="filter-label">Transmission (transmission_type)</label>
            <select id="val-transmission" className="filter-select" value={transmission} onChange={(e) => setTransmission(e.target.value)} required>
              <option value="">Select Transmission</option>
              <option value="Manual">Manual</option>
              <option value="Automatic">Automatic</option>
            </select>
          </div>

          <div>
            <label className="filter-label">Seller Type (seller_type)</label>
            <select id="val-seller-type" className="filter-select" value={sellerType} onChange={(e) => setSellerType(e.target.value)} required>
              <option value="Individual">Individual (Direct Owner)</option>
              <option value="Dealer">Dealer (Used Car Showroom)</option>
              <option value="Trustmark Dealer">Trustmark Dealer (Brand Certified)</option>
            </select>
          </div>

          <div>
            <label className="filter-label">Owners Count</label>
            <select id="val-owners" className="filter-select" value={owners} onChange={(e) => setOwners(e.target.value ? Number(e.target.value) : "")} required>
              <option value="">Select Owners</option>
              <option value="1">1st Owner (Single)</option>
              <option value="2">2nd Owner</option>
              <option value="3">3rd Owner</option>
              <option value="4">4+ Owners</option>
            </select>
          </div>

          <div>
            <label className="filter-label">Metro Location</label>
            <select id="val-city" className="filter-select" value={city} onChange={(e) => setCity(e.target.value)} required>
              <option value="">Select City</option>
              <option value="Delhi">Delhi NCR</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
              <option value="Kolkata">Kolkata</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Jaipur">Jaipur</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Kochi">Kochi</option>
            </select>
          </div>

          {/* Continuous Regression Mechanical Specifications Toggle */}
          <div style={{ gridColumn: "1 / -1", background: "rgba(37, 99, 235, 0.03)", border: "1px dashed rgba(37, 99, 235, 0.25)", borderRadius: "var(--radius-sm)", padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowSpecs(!showSpecs)}>
              <div>
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--liquid-blue)" }}>
                  ⚙️ Mechanical Specifications (engine, max_power, mileage, seats)
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                  {showSpecs ? "(Click to collapse)" : "(Auto-calibrated from Cardekho segment medians: cc, BHP, kmpl, seats)"}
                </span>
              </div>
              <button type="button" className="liquid-btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                {showSpecs ? "Hide Mechanical Specs" : "Customize Mechanical Specs"}
              </button>
            </div>

            {showSpecs && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-glass)" }}>
                <div>
                  <label className="filter-label">Engine Capacity (engine in cc)</label>
                  <input id="val-engine" className="filter-input" type="number" min="600" max="6500" placeholder="e.g. 1197" value={engine} onChange={(e) => setEngine(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div>
                  <label className="filter-label">Max Power (max_power in BHP)</label>
                  <input id="val-max-power" className="filter-input" type="number" min="30" max="800" step="0.1" placeholder="e.g. 82.0" value={maxPower} onChange={(e) => setMaxPower(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div>
                  <label className="filter-label">Certified Mileage (mileage in kmpl)</label>
                  <input id="val-mileage" className="filter-input" type="number" min="5" max="35" step="0.1" placeholder="e.g. 19.5" value={mileage} onChange={(e) => setMileage(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div>
                  <label className="filter-label">Total Seats (seats)</label>
                  <select id="val-seats" className="filter-select" value={seats} onChange={(e) => setSeats(e.target.value ? Number(e.target.value) : "")}>
                    <option value="2">2 Seater (Coupe/Roadster)</option>
                    <option value="4">4 Seater</option>
                    <option value="5">5 Seater (Standard Hatchback/Sedan/SUV)</option>
                    <option value="6">6 Seater (Captain Seats)</option>
                    <option value="7">7 Seater (Family SUV/MUV)</option>
                    <option value="8">8 Seater (MUV)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
            <button
              id="val-submit-btn"
              type="submit"
              className="liquid-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem" }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M4 12a8 8 0 018-8" /></svg>
                  Analyzing Current Market Trends & Statistics...
                </span>
              ) : make && model ? (
                `Estimate Fair Market Price for ${year ? year + " " : ""}${make} ${model}`
              ) : (
                "Estimate Fair Market Price"
              )}
            </button>
          </div>
        </form>

        {error && <div style={{ color: "var(--liquid-rose)", textAlign: "center", marginBottom: 20 }}>{error}</div>}

        {result && (
          <div style={{
            background: "#ffffff",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-md)",
            padding: "32px",
            boxShadow: "var(--shadow-lg)",
          }}>
            {/* Engine Status Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "6px 14px", borderRadius: "20px", fontSize: "0.8rem", color: "var(--liquid-emerald)", fontWeight: 700 }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981" }} />
                <span>⚡ {result.prediction_provenance?.algorithm ? `${result.prediction_provenance.algorithm} Regression Engine` : "XGBoost Regression Engine"}</span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                ML Confidence: <strong style={{ color: "var(--liquid-emerald)" }}>{Math.round(result.confidence_score * 100)}% verified</strong>
              </div>
            </div>

            {/* Regulatory Advisory Alert if present */}
            {result.market_trends?.regulatory_advisory && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                borderRadius: "var(--radius-sm)",
                padding: "14px 18px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}>
                <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                <div>{result.market_trends.regulatory_advisory}</div>
              </div>
            )}

            {/* Fair Market Value Hero */}
            <div style={{ textAlign: "center", marginBottom: 28, padding: "20px 0", borderBottom: "1px solid var(--border-glass)" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--liquid-blue)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Current Fair Market Asking Price (selling_price)
              </div>
              <div style={{ fontSize: "3.2rem", fontWeight: 900, color: "var(--text-main)", margin: "8px 0", letterSpacing: "-0.02em" }}>
                {formatINR(result.estimated_fair_price)}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
                Expected Market Range: <strong style={{ color: "var(--text-main)" }}>{formatINR(result.price_range_low)}</strong> – <strong style={{ color: "var(--text-main)" }}>{formatINR(result.price_range_high)}</strong>
              </div>
            </div>

            {/* Supervised Continuous Regression Input Matrix */}
            <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Cardekho Dataset Features Evaluated by XGBoost
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--liquid-blue)", fontWeight: 700 }}>
                  11 Attributes &rarr; selling_price
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.78rem" }}>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>brand:</strong>&nbsp;{make}</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>model:</strong>&nbsp;{model}</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>vehicle_age:</strong>&nbsp;{year ? 2026 - Number(year) : "4"} yrs</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>km_driven:</strong>&nbsp;{Number(odometer).toLocaleString()} km</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>mileage:</strong>&nbsp;{mileage || "19.5"} kmpl</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>engine:</strong>&nbsp;{engine || "1200"} cc</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>max_power:</strong>&nbsp;{maxPower || "82"} BHP</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>seats:</strong>&nbsp;{seats || 5}</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>seller_type:</strong>&nbsp;{sellerType}</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>fuel_type:</strong>&nbsp;{fuel}</span>
                <span className="hero-pill" style={{ padding: "4px 10px" }}><strong>transmission_type:</strong>&nbsp;{transmission}</span>
              </div>
            </div>

            {/* 3-Way Transaction Price Matrix */}
            {result.price_breakdown && (
              <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                  Real Transaction Price Tiers (Indian Pre-Owned Market)
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "14px",
                }}>
                  <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700 }}>INSTANT CASH / TRADE-IN</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-muted)", margin: "4px 0" }}>
                      {formatINR(result.price_breakdown.dealer_trade_in)}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>Spinny / Cars24 / Dealer Buying Pool</div>
                  </div>

                  <div style={{ background: "#eff6ff", padding: "16px 20px", borderRadius: "var(--radius-sm)", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--liquid-blue)", fontWeight: 700 }}>FAIR MARKET VALUE</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", margin: "4px 0" }}>
                      {formatINR(result.estimated_fair_price)}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Central Market Equilibrium</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700 }}>CERTIFIED SHOWROOM RETAIL</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--liquid-emerald)", margin: "4px 0" }}>
                      {formatINR(result.price_breakdown.certified_retail)}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>Dealer retail with warranty & prep</div>
                  </div>
                </div>
              </div>
            )}

            {/* Current Market Dynamics & Trend Gauges */}
            {result.market_trends && (
              <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                  Current Market Statistics & Trend Dynamics
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "14px",
                  background: "#f8fafc",
                  padding: "18px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-glass)",
                }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>MARKET DEMAND</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        background: result.market_trends.demand_level.toLowerCase() === "high" ? "#dcfce7" : "#fef3c7",
                        color: result.market_trends.demand_level.toLowerCase() === "high" ? "#15803d" : "#b45309",
                        border: result.market_trends.demand_level.toLowerCase() === "high" ? "1px solid #bbf7d0" : "1px solid #fde68a",
                      }}>
                        {result.market_trends.demand_level}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{result.market_trends.demand_score}/100</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>VALUE RETENTION</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--liquid-blue)", marginTop: "4px" }}>
                      {result.market_trends.resale_retention_pct}%
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>vs original ex-showroom</div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>ANNUAL DEPRECIATION</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
                      ~{result.market_trends.annual_depreciation_pct}% / yr
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>current curve slope</div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>EXPECTED TURNAROUND</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", marginTop: "4px" }}>
                      {result.market_trends.typical_days_to_sell}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>to close a transaction</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Market Intelligence Narrative */}
            {result.market_trends?.market_trend_summary && (
              <div style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "var(--radius-sm)",
                padding: "18px 22px",
                marginBottom: "28px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", fontWeight: 700, color: "var(--liquid-blue)", marginBottom: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                  <span>AI Automotive Market Analysis</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.92rem", color: "#1e293b", lineHeight: 1.6 }}>
                  {result.market_trends.market_trend_summary}
                </p>
              </div>
            )}

            {/* Valuation Drivers / Factors */}
            {result.valuation_factors && result.valuation_factors.length > 0 && (
              <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                  Key Valuation Drivers & Adjustments
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                  {result.valuation_factors.map((f, i) => (
                    <div key={i} style={{
                      background: "#ffffff",
                      border: "1px solid var(--border-glass)",
                      padding: "12px 16px",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}>
                      <div>
                        <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-main)" }}>{f.label}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginTop: "2px" }}>{f.description}</div>
                      </div>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        background: f.type === "positive" ? "#dcfce7" : (f.type === "critical" ? "#fee2e2" : "#fef2f2"),
                        color: f.type === "positive" ? "#15803d" : (f.type === "critical" ? "#991b1b" : "#b91c1c"),
                        border: f.type === "positive" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                      }}>
                        {f.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portal verification links */}
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "var(--radius-sm)", marginBottom: "22px", border: "1px solid var(--border-glass)" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px" }}>
                Cross-Verify Live Portal Benchmarks in {city}:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
                <a
                  href={`https://www.carwale.com/used/${makeSlug}-${modelSlug}-cars/${citySlug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-btn-secondary"
                  style={{ justifyContent: "space-between", padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>CarWale {city}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                      {result.portal_benchmarks?.carwale?.estimated_range || "View live feed"}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>

                <a
                  href={`https://www.spinny.com/used-cars/${citySlug}/${makeSlug}-${modelSlug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-btn-secondary"
                  style={{ justifyContent: "space-between", padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Spinny Assured</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                      {result.portal_benchmarks?.spinny?.estimated_range || "View live hub"}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>

                <a
                  href={`https://www.cars24.com/buy-used-car/${citySlug}/${makeSlug}-${modelSlug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-btn-secondary"
                  style={{ justifyContent: "space-between", padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Cars24 Certified</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                      {result.portal_benchmarks?.cars24?.estimated_range || "View verified stock"}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>

                <a
                  href={`https://www.cardekho.com/used-${makeSlug}+{modelSlug}+cars+in+${citySlug}.htm`}
                  target="_blank"
                  rel="noreferrer"
                  className="liquid-btn-secondary"
                  style={{ justifyContent: "space-between", padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>CarDekho Trustmark</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                      {result.portal_benchmarks?.cardekho?.estimated_range || "View market listings"}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            </div>

            <div className="disclaimer-box" style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
              {result.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
