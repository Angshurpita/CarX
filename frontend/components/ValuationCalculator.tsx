"use client";

import React, { useState } from "react";
import { estimateFairPrice, ValuationRequest, ValuationResponse } from "../lib/api";
import { formatINR } from "./ListingCard";

const MAKE_MODELS_MAP: Record<string, string[]> = {
  "Toyota": ["Fortuner", "Innova Crysta", "Innova Hycross", "Urban Cruiser Hyryder", "Glanza", "Camry", "Hilux"],
  "Mahindra": ["Thar", "Scorpio-N", "Scorpio Classic", "XUV700", "XUV300", "Bolero", "Bolero Neo"],
  "Tata": ["Safari", "Harrier", "Nexon", "Nexon EV", "Punch", "Punch EV", "Altroz", "Tiago", "Curvv"],
  "Hyundai": ["Creta", "Venue", "Verna", "i20", "Exter", "Alcazar", "Tucson", "Grand i10"],
  "Maruti Suzuki": ["Grand Vitara", "Brezza", "Fronx", "Swift", "Baleno", "Dzire", "Ertiga", "XL6", "Jimny", "Ciaz", "WagonR"],
  "Kia": ["Seltos", "Sonet", "Carens", "Carnival", "EV6"],
  "Honda": ["Elevate", "City", "Amaze", "Jazz", "WR-V"],
  "Volkswagen": ["Virtus", "Taigun", "Polo", "Tiguan"],
  "Skoda": ["Slavia", "Kushaq", "Octavia", "Superb", "Kodiaq"],
  "MG": ["Hector", "Astor", "ZS EV", "Comet EV", "Gloster"],
  "Jeep": ["Compass", "Meridian", "Wrangler"],
  "BMW": ["3 Series", "5 Series", "X1", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLA", "GLE"],
  "Audi": ["A4", "A6", "Q3", "Q5", "Q7"],
};

const PRESETS = [
  { label: "2023 Mahindra Thar 4x4", make: "Mahindra", model: "Thar", variant: "LX Hard Top Diesel AT", year: 2023, odo: 18000, fuel: "Diesel", trans: "Automatic", city: "Mumbai" },
  { label: "2022 Toyota Fortuner 4x4", make: "Toyota", model: "Fortuner", variant: "4x4 AT Diesel", year: 2022, odo: 34000, fuel: "Diesel", trans: "Automatic", city: "Delhi" },
  { label: "2023 Tata Safari Dark", make: "Tata", model: "Safari", variant: "Fearless+ Dark AT", year: 2023, odo: 21000, fuel: "Diesel", trans: "Automatic", city: "Bengaluru" },
  { label: "2023 Hyundai Creta SX", make: "Hyundai", model: "Creta", variant: "SX(O) Turbo DCT", year: 2023, odo: 19000, fuel: "Petrol", trans: "Automatic", city: "Mumbai" },
  { label: "2022 Mahindra XUV700 AX7", make: "Mahindra", model: "XUV700", variant: "AX7L AWD AT", year: 2022, odo: 28000, fuel: "Diesel", trans: "Automatic", city: "Hyderabad" },
  { label: "2021 Toyota Innova Crysta", make: "Toyota", model: "Innova Crysta", variant: "2.4 VX Diesel", year: 2021, odo: 48000, fuel: "Diesel", trans: "Manual", city: "Pune" },
];

export default function ValuationCalculator() {
  const [make, setMake] = useState("Mahindra");
  const [model, setModel] = useState("Thar");
  const [variant, setVariant] = useState("LX Hard Top Diesel AT");
  const [year, setYear] = useState(2023);
  const [odometer, setOdometer] = useState(24000);
  const [fuel, setFuel] = useState("Diesel");
  const [transmission, setTransmission] = useState("Automatic");
  const [owners, setOwners] = useState(1);
  const [city, setCity] = useState("Mumbai");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [error, setError] = useState("");

  const handleMakeChange = (newMake: string) => {
    setMake(newMake);
    const available = MAKE_MODELS_MAP[newMake] || [];
    if (available.length > 0) {
      setModel(available[0]);
    }
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setMake(p.make);
    setModel(p.model);
    setVariant(p.variant);
    setYear(p.year);
    setOdometer(p.odo);
    setFuel(p.fuel);
    setTransmission(p.trans);
    setCity(p.city);
    setResult(null);
  };

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

  const makeSlug = make.toLowerCase().replace(/ /g, "-");
  const modelSlug = model.toLowerCase().replace(/ /g, "-");
  const citySlug = city.toLowerCase();

  return (
    <div className="glass-panel" style={{ padding: "36px", maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <span className="hero-pill">⚡ Calibrated on 2024–2026 Indian Resale Transactions</span>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "8px" }}>
          Machine Learning Fair-Price Estimator
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "680px", margin: "8px auto 0" }}>
          Trained across 6,000+ verified Indian vehicle records spanning 94 models (2012–2026). Combines depreciation curves, mileage decay, and metro road-tax adjustments.
        </p>
      </div>

      {/* Quick Presets */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: "28px" }}>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="tag-btn"
            style={{ fontSize: "0.8rem", padding: "6px 12px" }}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleEstimate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div>
          <label className="filter-label">Make</label>
          <select id="val-make" className="filter-select" value={make} onChange={(e) => handleMakeChange(e.target.value)}>
            {Object.keys(MAKE_MODELS_MAP).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="filter-label">Model</label>
          <select id="val-model" className="filter-select" value={model} onChange={(e) => setModel(e.target.value)}>
            {(MAKE_MODELS_MAP[make] || [model]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="filter-label">Variant</label>
          <input id="val-variant" className="filter-input" type="text" value={variant} onChange={(e) => setVariant(e.target.value)} />
        </div>

        <div>
          <label className="filter-label">Manufacturing Year</label>
          <input id="val-year" className="filter-input" type="number" min="2012" max="2026" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
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
          <label className="filter-label">Metro Location</label>
          <select id="val-city" className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
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
            className="search-submit-btn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Evaluating Valuation Model..." : `Calculate Fair Asking Price for ${year} ${make} ${model} ⚡`}
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
              Calibrated Fair Asking Price
            </div>
            <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "#fff", margin: "4px 0" }}>
              {formatINR(result.estimated_fair_price)}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Typical Market 90% Confidence Interval: <strong style={{ color: "#fff" }}>{formatINR(result.price_range_low)}</strong> – <strong style={{ color: "#fff" }}>{formatINR(result.price_range_high)}</strong>
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
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>ALGORITHM</div>
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

          {/* Direct Live Portal References */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px", borderRadius: "var(--radius-sm)", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-cyan)", marginBottom: "8px" }}>
              🌐 Live Market Portal Benchmarks:
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "0.85rem" }}>
              <a
                href={`https://www.carwale.com/used/${makeSlug}-${modelSlug}-cars/${citySlug}/`}
                target="_blank"
                rel="noreferrer"
                className="tag-btn"
              >
                🔗 CarWale {city} Listings ↗
              </a>
              <a
                href={`https://www.spinny.com/used-cars/${citySlug}/${makeSlug}-${modelSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="tag-btn"
              >
                🔗 Spinny {city} Hub ↗
              </a>
              <a
                href={`https://www.cars24.com/buy-used-car/${citySlug}/${makeSlug}-${modelSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="tag-btn"
              >
                🔗 Cars24 Certified ↗
              </a>
              <a
                href={`https://www.cardekho.com/used-${makeSlug}+${modelSlug}+cars+in+${citySlug}.htm`}
                target="_blank"
                rel="noreferrer"
                className="tag-btn"
              >
                🔗 CarDekho Trustmark ↗
              </a>
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
