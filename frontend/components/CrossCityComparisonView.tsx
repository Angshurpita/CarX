"use client";

import React, { useEffect, useState } from "react";
import { compareCityDeals, DealCompareCandidate, DealCompareResponse } from "../lib/api";
import { formatINR } from "./ListingCard";

interface CrossCityComparisonViewProps {
  initialMake?: string;
  initialModel?: string;
}

export default function CrossCityComparisonView({
  initialMake = "Maruti Suzuki",
  initialModel = "Swift",
}: CrossCityComparisonViewProps) {
  const [buyerCity, setBuyerCity] = useState("Mumbai");
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState(initialModel);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DealCompareResponse | null>(null);
  const [error, setError] = useState("");

  const runComparison = async () => {
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
    runComparison();
  }, [buyerCity, make, model]);

  return (
    <div className="glass-panel" style={{ padding: "32px", marginBottom: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px", marginBottom: "28px" }}>
        <div>
          <span className="hero-pill">🗺️ Inter-State Logistics & RTO Engine</span>
          <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
            Cross-City Deal Intelligence Matrix
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "4px" }}>
            Compare equivalent listings across Indian metros after calculating flatbed transport, multi-point inspection, and RTO re-registration road taxes.
          </p>
        </div>

        {/* City and Model controls */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <label className="filter-label">My Location (Buyer City)</label>
            <select
              id="buyer-city-select"
              className="filter-select"
              style={{ width: "160px" }}
              value={buyerCity}
              onChange={(e) => setBuyerCity(e.target.value)}
            >
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
            <label className="filter-label">Target Vehicle</label>
            <select
              id="target-model-select"
              className="filter-select"
              style={{ width: "220px" }}
              value={`${make}|${model}`}
              onChange={(e) => {
                const [mk, md] = e.target.value.split("|");
                setMake(mk);
                setModel(md);
              }}
            >
              <option value="Maruti Suzuki|Swift">Maruti Suzuki Swift</option>
              <option value="Hyundai|Creta">Hyundai Creta</option>
              <option value="Honda|City">Honda City</option>
              <option value="Tata|Nexon">Tata Nexon</option>
              <option value="Mahindra|XUV700">Mahindra XUV700</option>
              <option value="BMW|5 Series">BMW 5 Series</option>
              <option value="Toyota|Innova Crysta">Toyota Innova Crysta</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--brand-cyan)" }}>
          Calculating inter-city logistics, RTO tax slabs, and deal rankings...
        </div>
      )}

      {error && <div style={{ color: "var(--accent-rose)", marginBottom: 20 }}>{error}</div>}

      {data && data.candidates.length > 0 && (
        <div>
          {/* Top Deal Banner if cross-city savings exist */}
          {data.candidates[0].net_benefit_vs_local && data.candidates[0].net_benefit_vs_local > 0 && (
            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <strong style={{ color: "var(--accent-emerald)" }}>💡 Cross-City Arbitrage Opportunity Found!</strong>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Buying from <strong>{data.candidates[0].city}</strong> and shipping to <strong>{buyerCity}</strong> saves approximately <strong>{formatINR(data.candidates[0].net_benefit_vs_local)}</strong> even after paying all transport, inspection, and transfer costs!
                </div>
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
                +{formatINR(data.candidates[0].net_benefit_vs_local)} Saved
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
                  <th>Fair Asking Value</th>
                  <th>Logistics & RTO</th>
                  <th>Total Landed Cost</th>
                  <th>Deal Score</th>
                  <th>Verdict & Flags</th>
                </tr>
              </thead>
              <tbody>
                {data.candidates.map((c) => {
                  const scoreClass = c.deal_score >= 72 ? "score-high" : (c.deal_score >= 52 ? "score-med" : "score-low");
                  const diffColor = c.price_difference < 0 ? "var(--accent-emerald)" : "var(--accent-amber)";

                  return (
                    <tr key={c.listing_id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {c.year} {c.make} {c.model}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--brand-cyan)" }}>
                          {c.variant} • 📍 {c.city}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {c.odometer_km.toLocaleString("en-IN")} km • {c.fuel_type} {c.transmission}
                        </div>
                      </td>

                      <td style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                        {formatINR(c.asking_price)}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600 }}>{formatINR(c.estimated_fair_price)}</div>
                        <div style={{ fontSize: "0.75rem", color: diffColor, fontWeight: 700 }}>
                          {c.price_difference < 0 ? `-${formatINR(Math.abs(c.price_difference))} below market` : `+${formatINR(c.price_difference)} above market`}
                        </div>
                      </td>

                      <td style={{ fontSize: "0.82rem" }}>
                        <div>🚚 Transport: {c.transport_cost === 0 ? "₹0 (Local)" : formatINR(c.transport_cost)}</div>
                        <div>🔍 Inspection: {formatINR(c.inspection_cost)}</div>
                        <div>🏛️ RTO/NOC: {formatINR(c.rto_transfer_cost)}</div>
                        {c.distance_km > 0 && (
                          <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>Distance: {c.distance_km} km</div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
                          {formatINR(c.estimated_total_purchase_cost)}
                        </div>
                        {c.net_benefit_vs_local !== undefined && c.net_benefit_vs_local !== null && (
                          <div style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: c.net_benefit_vs_local > 0 ? "var(--accent-emerald)" : "var(--text-dim)"
                          }}>
                            {c.net_benefit_vs_local > 0 ? `+${formatINR(c.net_benefit_vs_local)} vs local` : `${formatINR(c.net_benefit_vs_local)} vs local`}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className={`deal-score-badge ${scoreClass}`}>
                          {Math.round(c.deal_score)}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>
                          {c.deal_verdict}
                        </div>
                        {c.risk_flags.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {c.risk_flags.map((rf, rIdx) => (
                              <span key={rIdx} style={{ fontSize: "0.72rem", color: "var(--accent-amber)" }}>
                                ⚠️ {rf}
                              </span>
                            ))}
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
            ℹ️ {data.disclaimer}
          </div>
        </div>
      )}

      {data && data.candidates.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          No comparable vehicles found across cities for the selected filters.
        </div>
      )}
    </div>
  );
}
