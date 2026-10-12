"use client";

import React, { useState } from "react";
import { estimateFairPrice, ValuationRequest, ValuationResponse } from "../lib/api";
import { formatINR } from "./ListingCard";

export default function ValuationCalculator() {
  const [make, setMake] = useState("Hyundai");
  const [model, setModel] = useState("Creta");
  const [variant, setVariant] = useState("SX Petrol");
  const [year, setYear] = useState(2021);
  const [odometer, setOdometer] = useState(42000);
  const [fuel, setFuel] = useState("Petrol");
  const [transmission, setTransmission] = useState("Manual");
  const [owners, setOwners] = useState(1);
  const [city, setCity] = useState("Mumbai");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [error, setError] = useState("");

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="glass-panel" style={{ padding: "36px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
          📊 Machine Learning Fair-Price Estimator
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "600px", margin: "8px auto 0" }}>
          Predict statistical asking prices calibrated on verified Indian metro transactions, chronological depreciation splits, and mileage decay models.
        </p>
      </div>

      <form onSubmit={handleEstimate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div>
          <label className="filter-label">Make</label>
          <select id="val-make" className="filter-select" value={make} onChange={(e) => setMake(e.target.value)}>
            <option value="Maruti Suzuki">Maruti Suzuki</option>
            <option value="Hyundai">Hyundai</option>
            <option value="Honda">Honda</option>
            <option value="Tata">Tata</option>
            <option value="Mahindra">Mahindra</option>
            <option value="Kia">Kia</option>
            <option value="Toyota">Toyota</option>
            <option value="BMW">BMW</option>
          </select>
        </div>

        <div>
          <label className="filter-label">Model</label>
          <input id="val-model" className="filter-input" type="text" value={model} onChange={(e) => setModel(e.target.value)} required />
        </div>

        <div>
          <label className="filter-label">Variant</label>
          <input id="val-variant" className="filter-input" type="text" value={variant} onChange={(e) => setVariant(e.target.value)} />
        </div>

        <div>
          <label className="filter-label">Mfg Year</label>
          <input id="val-year" className="filter-input" type="number" min="2012" max="2025" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
        </div>

        <div>
          <label className="filter-label">Odometer (km)</label>
          <input id="val-odometer" className="filter-input" type="number" min="1000" max="300000" step="1000" value={odometer} onChange={(e) => setOdometer(Number(e.target.value))} required />
        </div>

        <div>
          <label className="filter-label">Fuel</label>
          <select id="val-fuel" className="filter-select" value={fuel} onChange={(e) => setFuel(e.target.value)}>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="CNG">CNG</option>
            <option value="Electric">Electric</option>
          </select>
        </div>

        <div>
          <label className="filter-label">Transmission</label>
          <select id="val-transmission" className="filter-select" value={transmission} onChange={(e) => setTransmission(e.target.value)}>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
          </select>
        </div>

        <div>
          <label className="filter-label">Metro City</label>
          <select id="val-city" className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="Delhi">Delhi NCR</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Chennai">Chennai</option>
            <option value="Pune">Pune</option>
            <option value="Kolkata">Kolkata</option>
            <option value="Ahmedabad">Ahmedabad</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
          <button
            id="val-submit-btn"
            type="submit"
            className="search-submit-btn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Computing Fair-Price Model..." : "Calculate Fair Market Value ⚡"}
          </button>
        </div>
      </form>

      {error && <div style={{ color: "var(--accent-rose)", textAlign: "center", marginBottom: 20 }}>{error}</div>}

      {result && (
        <div style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "var(--radius-md)",
          padding: "28px",
          boxShadow: "0 0 25px rgba(59, 130, 246, 0.15)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: "0.85rem", color: "var(--brand-cyan)", fontWeight: 700, textTransform: "uppercase" }}>
              Statistical Fair Asking Price
            </div>
            <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "#fff", margin: "4px 0" }}>
              {formatINR(result.estimated_fair_price)}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Estimated 90% Prediction Interval: <strong style={{ color: "#fff" }}>{formatINR(result.price_range_low)}</strong> – <strong style={{ color: "#fff" }}>{formatINR(result.price_range_high)}</strong>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            background: "rgba(6, 9, 14, 0.6)",
            padding: "16px",
            borderRadius: "var(--radius-sm)",
            marginBottom: "20px"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>MODEL ALGORITHM</div>
              <div style={{ fontWeight: 700, color: "var(--brand-primary)" }}>{result.model_version}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>CONFIDENCE SCORE</div>
              <div style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>{Math.round(result.confidence_score * 100)}%</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>SEGMENT BASELINE MEDIAN</div>
              <div style={{ fontWeight: 700 }}>{formatINR(result.baseline_median_price)}</div>
            </div>
          </div>

          <div className="disclaimer-box" style={{ margin: 0 }}>
            ℹ️ {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
