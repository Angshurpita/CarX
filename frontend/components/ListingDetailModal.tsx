"use client";

import React, { useEffect, useState } from "react";
import { fetchListingDetail, NormalizedListing } from "../lib/api";
import { formatINR } from "./ListingCard";

interface ListingDetailModalProps {
  listingId: string;
  onClose: () => void;
}

export default function ListingDetailModal({ listingId, onClose }: ListingDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchListingDetail(listingId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [listingId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>

        {loading && <div style={{ padding: "40px", textAlign: "center" }}>Loading listing audit details...</div>}
        {error && <div style={{ color: "var(--accent-rose)", padding: "20px" }}>Error: {error}</div>}

        {data && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span className="card-badge-top" style={{ position: "static", display: "inline-block", marginBottom: 8 }}>
                  📍 {data.listing.city}, {data.listing.state}
                </span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                  {data.listing.year} {data.listing.make} {data.listing.model}
                </h2>
                <div style={{ color: "var(--brand-cyan)", fontSize: "1rem", fontWeight: 600 }}>
                  {data.listing.variant}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Asking Price</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fff" }}>
                  {formatINR(data.listing.asking_price)}
                </div>
              </div>
            </div>

            {/* Spec Matrix */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              background: "rgba(6, 9, 14, 0.5)",
              padding: "16px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "24px",
              border: "1px solid var(--border-subtle)"
            }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>ODOMETER</div>
                <div style={{ fontWeight: 700 }}>{data.listing.odometer_km.toLocaleString("en-IN")} km</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>FUEL TYPE</div>
                <div style={{ fontWeight: 700 }}>{data.listing.fuel_type}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>TRANSMISSION</div>
                <div style={{ fontWeight: 700 }}>{data.listing.transmission}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>BODY STYLE</div>
                <div style={{ fontWeight: 700 }}>{data.listing.body_style}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>OWNERS</div>
                <div style={{ fontWeight: 700 }}>{data.listing.owners_count} Previous</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>SELLER TYPE</div>
                <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{data.listing.seller_type}</div>
              </div>
            </div>

            {/* Price History */}
            <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
              📉 Observed Price Trajectory
            </h4>
            {data.price_history && data.price_history.length > 0 ? (
              <table className="deal-table" style={{ marginBottom: "24px" }}>
                <thead>
                  <tr>
                    <th>Observation Date</th>
                    <th>Recorded Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.price_history.map((h: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {new Date(h.observed_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatINR(h.price)}</td>
                      <td>
                        <span style={{
                          fontSize: "0.75rem",
                          color: "var(--brand-cyan)",
                          background: "rgba(6, 182, 212, 0.1)",
                          padding: "2px 8px",
                          borderRadius: "4px"
                        }}>
                          {idx === 0 ? "Latest" : "Historical"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "20px" }}>
                No prior price changes observed. Listing initial asking price has remained stable.
              </p>
            )}

            {/* Provenance & Source */}
            <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
              🔍 Data Provenance & Source Audit
            </h4>
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              padding: "16px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "24px",
              fontSize: "0.85rem"
            }}>
              <div style={{ marginBottom: "6px" }}>
                <strong>Feed / Provider:</strong> {data.provenance.provider_name}
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>Source ID:</strong> <code>{data.provenance.source_listing_id}</code>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>First Recorded:</strong> {data.provenance.first_observed_at ? new Date(data.provenance.first_observed_at).toLocaleString("en-IN") : "N/A"}
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>Last Validated:</strong> {data.provenance.last_observed_at ? new Date(data.provenance.last_observed_at).toLocaleString("en-IN") : "N/A"}
              </div>
              {data.provenance.source_url && (
                <a
                  href={data.provenance.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--brand-primary)",
                    textDecoration: "underline",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  Visit Original Listing Source ↗
                </a>
              )}
            </div>

            <div className="disclaimer-box" style={{ margin: 0 }}>
              ⚠️ <strong>Pre-Purchase Advisory:</strong> All CarX details are synchronized from verified feeds. Always verify physical service records, check for flood damage or chassis structural repairs, and test drive prior to monetary token commitments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
