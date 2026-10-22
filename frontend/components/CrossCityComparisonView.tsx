"use client";

import React, { useEffect, useState } from "react";
import { compareCityDeals, DealCompareResponse } from "../lib/api";
import { formatINR } from "./ListingCard";

interface CrossCityComparisonViewProps {
  initialMake?: string;
  initialModel?: string;
}

export default function CrossCityComparisonView({
  initialMake = "",
  initialModel = "",
}: CrossCityComparisonViewProps) {
  const [buyerCity, setBuyerCity] = useState("");
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState(initialModel);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DealCompareResponse | null>(null);
  const [error, setError] = useState("");

  const runComparison = async () => {
    if (!buyerCity || !make || !model) return;
    setLoading(true);
    setError("");
    try {
      const res = await compareCityDeals(buyerCity, make, model);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to compare city deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMake) setMake(initialMake);
    if (initialModel) setModel(initialModel);
  }, [initialMake, initialModel]);

  useEffect(() => {
    if (buyerCity && make && model) {
      runComparison();
    } else {
      setData(null);
    }
  }, [buyerCity, make, model]);

  return (
    <div style={{ maxWidth: "1120px", margin: "0 auto 60px auto" }}>
      {/* Section Banner with Custom Generated 3D Logistics Map Graphic */}
      <div className="section-feature-banner">
        <div className="banner-grid">
          <div className="banner-content">
            <span className="hero-pill">
              Inter-State Transport Logistics & Road Tax Engine
            </span>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: "8px", lineHeight: 1.2 }}>
              Cross-City Deal Intelligence Matrix
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "12px", lineHeight: 1.6 }}>
              Calculates vehicle price differentials between Indian metros alongside enclosed carrier freight, multi-point independent inspection, and destination state RTO re-registration tax slabs.
            </p>
          </div>
          <div className="banner-image-wrapper">
            <img
              src="/assets/cross_city_logistics.jpg"
              alt="Inter-City Car Transport Logistics Map"
              className="banner-custom-image"
            />
            <div className="banner-image-overlay" />
          </div>
        </div>
      </div>

      {/* Main Comparison Container in Liquid Glass */}
      <div className="glass-panel" style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px", marginBottom: "28px", borderBottom: "1px solid var(--border-glass)", paddingBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>
              Logistics & Arbitrage Simulator
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "4px" }}>
              Select your destination city and vehicle target to compute landed acquisition cost.
            </p>
          </div>

          {/* City and Model controls */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <label className="filter-label">Destination (Buyer City)</label>
              <select
                id="buyer-city-select"
                className="filter-select"
                style={{ width: "190px" }}
                value={buyerCity}
                onChange={(e) => setBuyerCity(e.target.value)}
              >
                <option value="">Select Destination City</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Pune">Pune</option>
                <option value="Kolkata">Kolkata</option>
              </select>
            </div>

            <div>
              <label className="filter-label">Target Model</label>
              <select
                id="target-model-select"
                className="filter-select"
                style={{ width: "230px" }}
                value={make && model ? `${make}|${model}` : ""}
                onChange={(e) => {
                  if (!e.target.value) {
                    setMake("");
                    setModel("");
                  } else {
                    const [mk, md] = e.target.value.split("|");
                    setMake(mk);
                    setModel(md);
                  }
                }}
              >
                <option value="">Select Target Model</option>
                <option value="Maruti Suzuki|Swift">Maruti Suzuki Swift</option>
                <option value="Hyundai|Creta">Hyundai Creta</option>
                <option value="Toyota|Fortuner">Toyota Fortuner</option>
                <option value="Mahindra|Thar">Mahindra Thar</option>
                <option value="Tata|Safari">Tata Safari</option>
                <option value="Mahindra|XUV700">Mahindra XUV700</option>
                <option value="Honda|City">Honda City</option>
                <option value="Tata|Nexon">Tata Nexon</option>
                <option value="BMW|5 Series">BMW 5 Series</option>
                <option value="Toyota|Innova Crysta">Toyota Innova Crysta</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ padding: "50px", textAlign: "center", color: "var(--liquid-blue)" }}>
            Computing carrier freight schedules, state road tax calculations, and deal arbitrage scores...
          </div>
        )}

        {error && <div style={{ color: "var(--liquid-rose)", marginBottom: 20 }}>{error}</div>}

        {!data && !loading && (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ margin: "0 auto 12px auto", display: "block", color: "var(--text-dim)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
              Select Destination City and Target Model
            </h4>
            <p style={{ fontSize: "0.88rem", maxWidth: "480px", margin: "0 auto" }}>
              Choose your destination buyer city and car model above to calculate inter-state shipping, carrier transit, RTO re-registration tax, and net price savings.
            </p>
          </div>
        )}

        {data && data.candidates.length > 0 && (
          <div>
            {/* Top Deal Banner if cross-city savings exist */}
            {data.candidates[0].net_benefit_vs_local && data.candidates[0].net_benefit_vs_local > 0 && (
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "var(--radius-sm)",
                padding: "18px 24px",
                marginBottom: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px"
              }}>
                <div>
                  <strong style={{ color: "#166534", fontSize: "1rem" }}>
                    Inter-State Arbitrage Advantage Identified
                  </strong>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Purchasing from <strong>{data.candidates[0].city}</strong> and transporting to <strong>{buyerCity}</strong> yields a net saving of approximately <strong>{formatINR(data.candidates[0].net_benefit_vs_local)}</strong> after accounting for all carrier freight, inspection, and transfer fees.
                  </div>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#15803d", whiteSpace: "nowrap" }}>
                  +{formatINR(data.candidates[0].net_benefit_vs_local)} Advantage
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="deal-table">
                <thead>
                  <tr>
                    <th>Vehicle & Origin</th>
                    <th>Asking Price</th>
                    <th>Fair Market Value</th>
                    <th>Carrier Freight & RTO</th>
                    <th>Landed Cost</th>
                    <th>Deal Score</th>
                    <th>Logistics Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {data.candidates.map((c) => {
                    const scoreClass = c.deal_score >= 72 ? "score-high" : (c.deal_score >= 52 ? "score-med" : "score-low");
                    const diffColor = c.price_difference < 0 ? "var(--liquid-emerald)" : "var(--liquid-amber)";

                    return (
                      <tr key={c.listing_id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                            {c.year} {c.make} {c.model}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "var(--liquid-blue)", fontWeight: 600 }}>
                            {c.variant} • {c.city}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                            {c.odometer_km.toLocaleString("en-IN")} km • {c.fuel_type} {c.transmission}
                          </div>
                        </td>

                        <td style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-main)" }}>
                          {formatINR(c.asking_price)}
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{formatINR(c.estimated_fair_price)}</div>
                          <div style={{ fontSize: "0.76rem", color: diffColor, fontWeight: 700 }}>
                            {c.price_difference < 0 ? `-${formatINR(Math.abs(c.price_difference))} vs market` : `+${formatINR(c.price_difference)} vs market`}
                          </div>
                        </td>

                        <td style={{ fontSize: "0.82rem" }}>
                          <div>Transport: {c.transport_cost === 0 ? "Local (₹0)" : formatINR(c.transport_cost)}</div>
                          <div>Inspection: {formatINR(c.inspection_cost)}</div>
                          <div>RTO / NOC: {formatINR(c.rto_transfer_cost)}</div>
                          {c.distance_km > 0 && (
                            <div style={{ color: "var(--text-dim)", fontSize: "0.74rem" }}>Transit: {c.distance_km} km</div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--liquid-blue)" }}>
                            {formatINR(c.estimated_total_purchase_cost)}
                          </div>
                          {c.net_benefit_vs_local !== undefined && c.net_benefit_vs_local !== null && (
                            <div style={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: c.net_benefit_vs_local > 0 ? "var(--liquid-emerald)" : "var(--text-dim)"
                            }}>
                              {c.net_benefit_vs_local > 0 ? `+${formatINR(c.net_benefit_vs_local)} vs local` : `${formatINR(c.net_benefit_vs_local)} vs local`}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={scoreClass}>
                            {c.deal_score}/100
                          </span>
                        </td>

                        <td style={{ fontSize: "0.85rem" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{c.deal_verdict}</div>
                          {c.risk_flags && c.risk_flags.length > 0 && (
                            <div style={{ color: "var(--liquid-amber)", fontSize: "0.75rem", marginTop: "2px" }}>
                              {c.risk_flags.join(", ")}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="disclaimer-box" style={{ marginTop: "24px" }}>
              {data.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
