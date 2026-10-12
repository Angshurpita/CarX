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
        <a href="#" className="nav-brand" onClick={() => setActiveTab("inventory")}>
          <div className="brand-badge">CarX</div>
          <div>
            <div className="brand-title">CarX Intelligence</div>
            <span className="brand-tagline">AI-Powered Used-Car Platform • India</span>
          </div>
        </a>

        <nav className="nav-tabs">
          <button
            id="nav-tab-inventory"
            className={`nav-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            🚗 Inventory & Deals
          </button>
          <button
            id="nav-tab-crosscity"
            className={`nav-tab-btn ${activeTab === "crosscity" ? "active" : ""}`}
            onClick={() => setActiveTab("crosscity")}
          >
            🗺️ Cross-City Deals
          </button>
          <button
            id="nav-tab-valuation"
            className={`nav-tab-btn ${activeTab === "valuation" ? "active" : ""}`}
            onClick={() => setActiveTab("valuation")}
          >
            📊 Fair-Price Estimator
          </button>
          <button
            id="nav-tab-assistant"
            className={`nav-tab-btn ${activeTab === "assistant" ? "active" : ""}`}
            onClick={() => setActiveTab("assistant")}
          >
            ✨ Gemma AI Assistant
          </button>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.8rem",
            color: "var(--accent-emerald)",
            background: "rgba(16, 185, 129, 0.1)",
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(16, 185, 129, 0.25)"
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)" }} />
            {catalogCount > 0 ? `${catalogCount} Live Listings` : "ML Model Ready"}
          </span>
        </div>
      </div>
    </header>
  );
}
