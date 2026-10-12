"use client";

import React from "react";
import { NormalizedListing } from "../lib/api";

interface ListingCardProps {
  listing: NormalizedListing;
  onSelect: (listing: NormalizedListing) => void;
  onCompareCity: (make: string, model: string) => void;
}

export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

const BODY_GLYPHS: Record<string, string> = {
  Hatchback: "🚗",
  Sedan: "🏎️",
  SUV: "🚙",
  MUV: "🚐",
  Luxury: "✨",
};

export default function ListingCard({ listing, onSelect, onCompareCity }: ListingCardProps) {
  const glyph = BODY_GLYPHS[listing.body_style] || "🚗";

  return (
    <div className="glass-panel car-card" id={`listing-card-${listing.id}`}>
      <div className="card-visual">
        <span className="card-visual-glyph">{glyph}</span>
        <div className="card-badge-top">📍 {listing.city}</div>
      </div>

      <div className="card-content">
        <h3 className="car-title">
          {listing.year} {listing.make} {listing.model}
        </h3>
        <div style={{ fontSize: "0.85rem", color: "var(--brand-cyan)", fontWeight: 600, marginBottom: 8 }}>
          {listing.variant}
        </div>

        <div className="car-spec-row">
          <span className="car-spec-pill">{listing.odometer_km.toLocaleString("en-IN")} km</span>
          <span className="car-spec-pill">{listing.fuel_type}</span>
          <span className="car-spec-pill">{listing.transmission}</span>
          <span className="car-spec-pill">{listing.owners_count} Owner</span>
        </div>

        <div className="price-container">
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Asking Price</div>
            <div className="asking-price">{formatINR(listing.asking_price)}</div>
          </div>
          <div className="fair-estimate-badge badge-discount">
            <span>Verified Listing</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "14px" }}>
          <button
            id={`btn-detail-${listing.id}`}
            className="btn-card-action"
            onClick={() => onSelect(listing)}
          >
            Details & Provenance
          </button>
          <button
            id={`btn-compare-${listing.id}`}
            className="btn-card-action"
            style={{ borderColor: "rgba(59, 130, 246, 0.4)", color: "var(--brand-cyan)" }}
            onClick={() => onCompareCity(listing.make, listing.model)}
          >
            Compare Cities 🗺️
          </button>
        </div>
      </div>
    </div>
  );
}
