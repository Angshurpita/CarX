"use client";

import React, { useEffect, useState } from "react";
import { fetchListingDetail } from "../lib/api";
import { formatINR } from "./ListingCard";
import { getCarImageUrl, getPortalMeta } from "../lib/carImages";

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

  const carImg = data?.listing ? (data.listing.image_url || getCarImageUrl(data.listing.make, data.listing.model, data.listing.body_style)) : "";
  const portal = data?.listing ? getPortalMeta(data.listing.source_url) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>

        {loading && (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--liquid-blue)" }}>
            Loading vehicle provenance & price history...
          </div>
        )}

        {error && (
          <div style={{ color: "var(--liquid-rose)", padding: "30px", textAlign: "center" }}>
            Unable to load vehicle details: {error}
          </div>
        )}

        {data && (
          <div>
            {/* Modal Header Car Image */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid var(--border-glass)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              marginBottom: "20px",
            }}>
              <div style={{
                height: "260px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
                padding: "20px",
              }}>
                <img
                  src={carImg}
                  alt={`${data.listing.make} ${data.listing.model}`}
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                />
              </div>
              
              <div style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--border-glass)",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.2)", padding: "4px 10px", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, color: "var(--liquid-blue)", marginBottom: "6px" }}>
                    <span>{data.listing.city}, {data.listing.state}</span>
                  </div>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    {data.listing.year} {data.listing.make} {data.listing.model}
                  </h2>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", fontWeight: 600, marginTop: "2px" }}>
                    {data.listing.variant}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                    Asking Price
                  </div>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--liquid-blue)" }}>
                    {formatINR(data.listing.asking_price)}
                  </div>
                </div>
              </div>
            </div>

            {/* Spec Matrix */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
              background: "#f8fafc",
              padding: "16px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "24px",
              border: "1px solid var(--border-glass)"
            }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>ODOMETER</div>
                <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{data.listing.odometer_km.toLocaleString("en-IN")} km</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>FUEL TYPE</div>
                <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{data.listing.fuel_type}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>TRANSMISSION</div>
                <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{data.listing.transmission}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>BODY STYLE</div>
                <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{data.listing.body_style}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>OWNERS</div>
                <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{data.listing.owners_count} Registered</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>SELLER TYPE</div>
                <div style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--text-main)" }}>{data.listing.seller_type}</div>
              </div>
            </div>

            {/* Price History */}
            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-main)" }}>
                Recorded Price Trajectory
              </h4>
              {data.price_history && data.price_history.length > 0 ? (
                <table className="deal-table">
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
                        <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{formatINR(h.price)}</td>
                        <td>
                          <span style={{
                            fontSize: "0.74rem",
                            color: "var(--liquid-blue)",
                            background: "rgba(37, 99, 235, 0.08)",
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)"
                          }}>
                            {idx === 0 ? "Latest Verified" : "Historical"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Listing initial asking price has remained stable across tracking period.
                </p>
              )}
            </div>

            {/* Provenance & Portal Source */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid var(--border-glass)",
              padding: "18px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "20px",
              fontSize: "0.86rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <strong style={{ color: "var(--text-main)" }}>Feed Provider & Origin:</strong>
                {portal && (
                  <span style={{ background: portal.color, color: "#fff", padding: "3px 12px", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700 }}>
                    {portal.name}
                  </span>
                )}
              </div>
              <div style={{ marginBottom: "6px", color: "var(--text-muted)" }}>
                Source Reference: <code style={{ color: "var(--liquid-blue)", background: "rgba(37, 99, 235, 0.08)", padding: "2px 6px", borderRadius: "4px" }}>{data.provenance.source_listing_id}</code>
              </div>
              <div style={{ marginBottom: "12px", color: "var(--text-muted)" }}>
                First Observed: {data.provenance.first_observed_at ? new Date(data.provenance.first_observed_at).toLocaleString("en-IN") : "Active Live Feed"}
              </div>
              {data.provenance.source_url && (
                <a
                  href={data.provenance.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-btn-secondary"
                  style={{ textDecoration: "none" }}
                >
                  <span>Open Original Listing on {portal?.name || "Source Portal"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            <div className="disclaimer-box">
              <strong>Buyer Advisory:</strong> Pre-purchase physical inspection is always recommended. Verify registration certificate (RC), insurance transfer documents, and loan hypothecation clearance before final payment transfer.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
