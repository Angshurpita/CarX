"use client";

import React from "react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  catalogCount: number;
}

export default function Navbar({ activeTab, setActiveTab, catalogCount }: NavbarProps) {
  return (
    <header className="glass-nav">
      <div className="container nav-inner">
        <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); setActiveTab("inventory"); }}>
          <div className="brand-badge">CarX</div>
          <div>
            <div className="brand-title">CarX Intelligence</div>
            <span className="brand-tagline">Used-Car Valuation & Arbitrage Platform</span>
          </div>
        </a>

        <nav className="nav-tabs">
          <button
            id="nav-tab-inventory"
            className={`nav-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3c-.1.2-.1.4-.1.6v4.5c0 .6.4 1 1 1h2m14 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m0 0H7" />
            </svg>
            <span>Cars & Portals</span>
          </button>
          
          <button
            id="nav-tab-crosscity"
            className={`nav-tab-btn ${activeTab === "crosscity" ? "active" : ""}`}
            onClick={() => setActiveTab("crosscity")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Cross-City Deals</span>
          </button>

          <button
            id="nav-tab-valuation"
            className={`nav-tab-btn ${activeTab === "valuation" ? "active" : ""}`}
            onClick={() => setActiveTab("valuation")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Fair-Price Estimator</span>
          </button>

          <button
            id="nav-tab-assistant"
            className={`nav-tab-btn ${activeTab === "assistant" ? "active" : ""}`}
            onClick={() => setActiveTab("assistant")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>AI Automotive Advisor</span>
          </button>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "var(--liquid-emerald)",
            background: "rgba(16, 185, 129, 0.12)",
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(16, 185, 129, 0.3)"
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--liquid-emerald)", boxShadow: "0 0 8px var(--liquid-emerald)" }} />
            {catalogCount > 0 ? `${catalogCount} Live Listings` : "ML Engine Ready"}
          </span>
        </div>
      </div>
    </header>
  );
}
