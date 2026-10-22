"use client";

import React, { useState } from "react";
import { estimateFairPrice, ValuationResponse } from "../lib/api";
import { formatINR } from "./ListingCard";

const MAKE_MODELS_MAP: Record<string, string[]> = {
  "Toyota": ["Fortuner", "Innova Crysta", "Innova Hycross", "Urban Cruiser Hyryder", "Glanza", "Camry"],
  "Mahindra": ["Thar", "Scorpio-N", "Scorpio Classic", "XUV700", "XUV300", "Bolero Neo"],
  "Tata": ["Safari", "Harrier", "Nexon", "Nexon EV", "Punch", "Altroz", "Tiago", "Curvv"],
  "Hyundai": ["Creta", "Venue", "Verna", "i20", "Exter", "Alcazar", "Tucson"],
  "Maruti Suzuki": ["Grand Vitara", "Brezza", "Fronx", "Swift", "Baleno", "Dzire", "Ertiga", "XL6", "Jimny", "Ciaz", "WagonR"],
  "Kia": ["Seltos", "Sonet", "Carens", "Carnival"],
  "Honda": ["City", "Elevate", "Amaze", "Jazz"],
  "Volkswagen": ["Virtus", "Taigun", "Polo"],
  "Skoda": ["Slavia", "Kushaq", "Octavia", "Kodiaq"],
  "MG": ["Hector", "Astor", "ZS EV"],
  "Jeep": ["Compass", "Meridian"],
  "BMW": ["3 Series", "5 Series", "X1"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC"],
  "Audi": ["A4", "A6", "Q3", "Q5"],
};

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

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [error, setError] = useState("");

  const handleMakeChange = (newMake: string) => {
    setMake(newMake);
    setModel("");
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

      {/* Main Calculator Form in Liquid Glass */}
      <div className="glass-panel" style={{ padding: "36px" }}>
        <form onSubmit={handleEstimate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px", marginBottom: "32px" }}>
          <div>
            <label className="filter-label">Make / Manufacturer</label>
            <select id="val-make" className="filter-select" value={make} onChange={(e) => handleMakeChange(e.target.value)} required>
              <option value="">Select Make</option>
              {Object.keys(MAKE_MODELS_MAP).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="filter-label">Model Line</label>
            <select id="val-model" className="filter-select" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make} required>
              <option value="">{make ? "Select Model" : "Select Make First"}</option>
              {(MAKE_MODELS_MAP[make] || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="filter-label">Trim / Variant</label>
            <input id="val-variant" className="filter-input" type="text" placeholder="Enter trim or variant (e.g. LX, VXI, Titanium)" value={variant} onChange={(e) => setVariant(e.target.value)} />
          </div>

          <div>
            <label className="filter-label">Manufacturing Year</label>
            <input id="val-year" className="filter-input" type="number" min="2010" max="2026" placeholder="e.g. 2022" value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} required />
          </div>

          <div>
            <label className="filter-label">Odometer Reading (km)</label>
            <input id="val-odometer" className="filter-input" type="number" min="1000" max="300000" step="1000" placeholder="e.g. 35000" value={odometer} onChange={(e) => setOdometer(e.target.value ? Number(e.target.value) : "")} required />
          </div>

          <div>
            <label className="filter-label">Fuel Type</label>
            <select id="val-fuel" className="filter-select" value={fuel} onChange={(e) => setFuel(e.target.value)} required>
              <option value="">Select Fuel</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
            </select>
          </div>

          <div>
            <label className="filter-label">Transmission</label>
            <select id="val-transmission" className="filter-select" value={transmission} onChange={(e) => setTransmission(e.target.value)} required>
              <option value="">Select Transmission</option>
              <option value="Manual">Manual</option>
              <option value="Automatic">Automatic</option>
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
                Current Fair Market Asking Price
              </div>
              <div style={{ fontSize: "3.2rem", fontWeight: 900, color: "var(--text-main)", margin: "8px 0", letterSpacing: "-0.02em" }}>
                {formatINR(result.estimated_fair_price)}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
                Expected Market Range: <strong style={{ color: "var(--text-main)" }}>{formatINR(result.price_range_low)}</strong> – <strong style={{ color: "var(--text-main)" }}>{formatINR(result.price_range_high)}</strong>
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
