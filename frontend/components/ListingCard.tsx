"use client";

import React, { useState } from "react";
import { NormalizedListing } from "../lib/api";
import { getCarImageUrl, getPortalMeta } from "../lib/carImages";

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

export default function ListingCard({ listing, onSelect, onCompareCity }: ListingCardProps) {
  const initialImg = listing.image_url || getCarImageUrl(listing.make, listing.model, listing.body_style);
  const [imgSrc, setImgSrc] = useState(initialImg);
  const portal = getPortalMeta(listing.source_url);

  return (
    <div className="glass-panel car-card" id={`listing-card-${listing.id}`}>
      {/* Visual Car Image Section with Badges */}
      <div className="card-visual-wrapper">
        <img
          src={imgSrc}
          alt={`${listing.year} ${listing.make} ${listing.model}`}
          className="card-car-img"
          loading="lazy"
          onError={() => {
            // Graceful fallback to verified body-style image
            setImgSrc(getCarImageUrl(listing.make, listing.model));
          }}
        />
        <div className="card-image-gradient" />

        {/* City Location Tag */}
        <div className="card-badge-top-left">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{listing.city}</span>
        </div>

        {/* Portal Source Badge */}
        {listing.source_url ? (
          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`card-badge-top-right ${portal.tagClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{portal.name}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <span className="card-badge-top-right badge-generic">Verified Feed</span>
        )}
      </div>

      {/* Card Content Details */}
      <div className="card-content">
        <h3 className="car-title">
          {listing.year} {listing.make} {listing.model}
        </h3>
        <div className="car-variant-tag">{listing.variant}</div>

        <div className="car-spec-row">
          <span className="car-spec-pill">{listing.odometer_km.toLocaleString("en-IN")} km</span>
          <span className="car-spec-pill">{listing.fuel_type}</span>
          <span className="car-spec-pill">{listing.transmission}</span>
          <span className="car-spec-pill">{listing.owners_count} Owner</span>
        </div>

        <div className="price-container">
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
              Asking Price
            </div>
            <div className="asking-price">{formatINR(listing.asking_price)}</div>
          </div>
          <div className="fair-estimate-badge badge-discount">
            <span>Verified Valuation</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "8px", marginTop: "14px" }}>
          <button
            id={`btn-detail-${listing.id}`}
            className="btn-card-action"
            onClick={() => onSelect(listing)}
          >
            <span>Audit & Specs</span>
          </button>
          <button
            id={`btn-compare-${listing.id}`}
            className="btn-card-action"
            style={{ borderColor: "rgba(37, 99, 235, 0.3)", color: "var(--liquid-blue)" }}
            onClick={() => onCompareCity(listing.make, listing.model)}
          >
            <span>Compare Metros</span>
          </button>
        </div>
      </div>
    </div>
  );
}
