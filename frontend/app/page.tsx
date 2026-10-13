"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ListingCard from "../components/ListingCard";
import ListingDetailModal from "../components/ListingDetailModal";
import ValuationCalculator from "../components/ValuationCalculator";
import CrossCityComparisonView from "../components/CrossCityComparisonView";
import AssistantChat from "../components/AssistantChat";
import { fetchCars, fetchMetadata, MetadataFacets, NormalizedListing } from "../lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState("inventory");

  // Filter States
  const [naturalQuery, setNaturalQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedFuel, setSelectedFuel] = useState("");
  const [selectedTrans, setSelectedTrans] = useState("");
  const [selectedBody, setSelectedBody] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);

  // Data States
  const [listings, setListings] = useState<NormalizedListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metadata, setMetadata] = useState<MetadataFacets | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Cross-City selection
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [compareTarget, setCompareTarget] = useState<{ make: string; model: string }>({
    make: "Maruti Suzuki",
    model: "Swift",
  });

  // Load Metadata once
  useEffect(() => {
    fetchMetadata()
      .then((m) => setMetadata(m))
      .catch((err) => console.error("Metadata load error", err));
  }, []);

  // Fetch Listings on filter change
  const loadListings = () => {
    setLoading(true);
    fetchCars({
      make: selectedMake || undefined,
      city: selectedCity || undefined,
      fuel_type: selectedFuel || undefined,
      transmission: selectedTrans || undefined,
      body_style: selectedBody || undefined,
      price_max: maxPrice ? Number(maxPrice) : undefined,
      sort_by: sortBy,
      page,
      page_size: 12,
    })
      .then((res) => {
        setListings(res.items);
        setTotalCount(res.total);
        setTotalPages(res.total_pages);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch cars error", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadListings();
  }, [selectedMake, selectedCity, selectedFuel, selectedTrans, selectedBody, maxPrice, sortBy, page]);

  const handleNaturalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = naturalQuery.toLowerCase();
    if (q.includes("diesel")) setSelectedFuel("Diesel");
    else if (q.includes("petrol")) setSelectedFuel("Petrol");
    else if (q.includes("cng")) setSelectedFuel("CNG");
    else if (q.includes("electric") || q.includes("ev")) setSelectedFuel("Electric");

    if (q.includes("auto")) setSelectedTrans("Automatic");
    else if (q.includes("manual")) setSelectedTrans("Manual");

    if (q.includes("suv")) setSelectedBody("SUV");
    else if (q.includes("sedan")) setSelectedBody("Sedan");
    else if (q.includes("hatchback")) setSelectedBody("Hatchback");

    if (q.includes("mumbai")) setSelectedCity("Mumbai");
    else if (q.includes("delhi")) setSelectedCity("Delhi");
    else if (q.includes("bengaluru") || q.includes("bangalore")) setSelectedCity("Bengaluru");
    else if (q.includes("kolkata")) setSelectedCity("Kolkata");

    if (q.includes("thar") || q.includes("scorpio") || q.includes("xuv") || q.includes("bolero")) { setSelectedMake("Mahindra"); }
    else if (q.includes("fortuner") || q.includes("innova") || q.includes("hyryder") || q.includes("glanza")) { setSelectedMake("Toyota"); }
    else if (q.includes("safari") || q.includes("harrier") || q.includes("nexon") || q.includes("punch") || q.includes("altroz") || q.includes("tiago")) { setSelectedMake("Tata"); }
    else if (q.includes("creta") || q.includes("venue") || q.includes("verna") || q.includes("i20") || q.includes("exter") || q.includes("alcazar")) { setSelectedMake("Hyundai"); }
    else if (q.includes("seltos") || q.includes("sonet") || q.includes("carens") || q.includes("carnival")) { setSelectedMake("Kia"); }
    else if (q.includes("swift") || q.includes("baleno") || q.includes("brezza") || q.includes("vitara") || q.includes("fronx") || q.includes("dzire") || q.includes("ertiga")) { setSelectedMake("Maruti Suzuki"); }
    else if (q.includes("city") || q.includes("elevate") || q.includes("amaze")) { setSelectedMake("Honda"); }
    else if (q.includes("virtus") || q.includes("taigun") || q.includes("polo")) { setSelectedMake("Volkswagen"); }
    else if (q.includes("slavia") || q.includes("kushaq") || q.includes("octavia") || q.includes("superb")) { setSelectedMake("Skoda"); }
    else if (q.includes("hector") || q.includes("astor") || q.includes("zs")) { setSelectedMake("MG"); }
    else if (q.includes("compass") || q.includes("meridian")) { setSelectedMake("Jeep"); }
    else if (q.includes("bmw") || q.includes("3 series") || q.includes("5 series") || q.includes("x1")) { setSelectedMake("BMW"); }
    else if (q.includes("mercedes") || q.includes("c-class") || q.includes("e-class") || q.includes("glc")) { setSelectedMake("Mercedes-Benz"); }
    else if (q.includes("audi") || q.includes("a4") || q.includes("a6") || q.includes("q3") || q.includes("q5")) { setSelectedMake("Audi"); }

    const lakhMatch = q.match(/(\d+)\s*(lakh|lac|l)/);
    if (lakhMatch) {
      setMaxPrice(String(Number(lakhMatch[1]) * 100000));
    }

    setActiveTab("inventory");
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedMake("");
    setSelectedCity("");
    setSelectedFuel("");
    setSelectedTrans("");
    setSelectedBody("");
    setMaxPrice("");
    setNaturalQuery("");
    setSortBy("date_desc");
    setPage(1);
  };

  const handleCardCompare = (make: string, model: string) => {
    setCompareTarget({ make, model });
    setActiveTab("crosscity");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} catalogCount={totalCount} />

      <main className="container" style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-pill">
            🇮🇳 India's 1st AI-Calibrated Cross-City Used-Car Intelligence Platform
          </div>
          <h1 className="hero-title">
            Find the Right Car. <br />
            <span className="gradient-text">At the Right Price. In Any City.</span>
          </h1>
          <p className="hero-subtitle">
            Combines verified market feeds, machine-learning fair asking price estimation, inter-metro transport & RTO tax calculations, and a Gemma conversational AI assistant.
          </p>

          {/* Natural Language Prompt Search Bar */}
          <div className="search-wrapper">
            <form className="search-box" onSubmit={handleNaturalSearch}>
              <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>🔍</span>
              <input
                id="natural-search-input"
                className="search-input"
                type="text"
                placeholder="Try 'Find diesel automatic SUV in Delhi under 15 lakh' or 'Swift in Mumbai'..."
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
              />
              <button id="natural-search-submit" type="submit" className="search-submit-btn">
                Search AI Index
              </button>
            </form>

            <div className="quick-tags">
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", alignSelf: "center" }}>Quick Filters:</span>
              <button className="tag-btn" onClick={() => { setSelectedBody("SUV"); setSelectedFuel("Diesel"); setActiveTab("inventory"); }}>
                🚙 Diesel SUV
              </button>
              <button className="tag-btn" onClick={() => { setSelectedMake("Hyundai"); setActiveTab("inventory"); }}>
                ⚡ Hyundai Creta
              </button>
              <button className="tag-btn" onClick={() => { setSelectedCity("Mumbai"); setActiveTab("inventory"); }}>
                📍 Mumbai Listings
              </button>
              <button className="tag-btn" onClick={() => { setMaxPrice("700000"); setActiveTab("inventory"); }}>
                💰 Under ₹7 Lakh
              </button>
              <button className="tag-btn" onClick={() => { setSelectedMake("BMW"); setActiveTab("inventory"); }}>
                ✨ Luxury Sedans
              </button>
            </div>
          </div>
        </section>

        {/* View Switching */}
        {activeTab === "inventory" && (
          <div className="inventory-layout">
            {/* Filter Sidebar */}
            <aside className="glass-panel filters-sidebar">
              <div className="sidebar-title">
                <span>Filter Vehicles</span>
                <button
                  onClick={resetFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--brand-primary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Reset All
                </button>
              </div>

              <div className="filter-group">
                <label className="filter-label">Manufacturer (Make)</label>
                <select
                  id="filter-make"
                  className="filter-select"
                  value={selectedMake}
                  onChange={(e) => { setSelectedMake(e.target.value); setPage(1); }}
                >
                  <option value="">All Makes</option>
                  {metadata?.makes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Registered City</label>
                <select
                  id="filter-city"
                  className="filter-select"
                  value={selectedCity}
                  onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
                >
                  <option value="">All Cities</option>
                  {metadata?.cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Fuel Type</label>
                <select
                  id="filter-fuel"
                  className="filter-select"
                  value={selectedFuel}
                  onChange={(e) => { setSelectedFuel(e.target.value); setPage(1); }}
                >
                  <option value="">All Fuels</option>
                  {metadata?.fuel_types.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Transmission</label>
                <select
                  id="filter-trans"
                  className="filter-select"
                  value={selectedTrans}
                  onChange={(e) => { setSelectedTrans(e.target.value); setPage(1); }}
                >
                  <option value="">All Transmissions</option>
                  {metadata?.transmissions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Body Style</label>
                <select
                  id="filter-body"
                  className="filter-select"
                  value={selectedBody}
                  onChange={(e) => { setSelectedBody(e.target.value); setPage(1); }}
                >
                  <option value="">All Styles</option>
                  {metadata?.body_styles.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Max Budget (INR)</label>
                <input
                  id="filter-maxprice"
                  type="number"
                  className="filter-input"
                  placeholder="e.g. 1500000"
                  step="50000"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Sort By</label>
                <select
                  id="filter-sortby"
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date_desc">Latest Observed</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="year_desc">Manufacturing Year: Newest</option>
                  <option value="km_asc">Odometer: Lowest km</option>
                </select>
              </div>
            </aside>

            {/* Results Grid */}
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  Showing <span style={{ color: "var(--brand-cyan)" }}>{totalCount}</span> Verified Listings
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
                  Page {page} of {totalPages}
                </div>
              </div>

              {loading && (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading vehicle listings and market parameters...
                </div>
              )}

              {!loading && listings.length === 0 && (
                <div className="glass-panel" style={{ padding: "48px", textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔍</div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No vehicles found matching filters</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "6px" }}>
                    Try clearing one or more filters to broaden your search results.
                  </p>
                  <button className="tag-btn" style={{ marginTop: "16px", padding: "8px 18px" }} onClick={resetFilters}>
                    Reset All Filters
                  </button>
                </div>
              )}

              {!loading && listings.length > 0 && (
                <div className="cards-grid">
                  {listings.map((l) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      onSelect={(item) => setSelectedListingId(item.id)}
                      onCompareCity={handleCardCompare}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "40px" }}>
                  <button
                    className="tag-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "0.85rem", alignSelf: "center", color: "var(--text-muted)" }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    className="tag-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "crosscity" && (
          <CrossCityComparisonView
            initialMake={compareTarget.make}
            initialModel={compareTarget.model}
          />
        )}

        {activeTab === "valuation" && (
          <ValuationCalculator />
        )}

        {activeTab === "assistant" && (
          <AssistantChat />
        )}
      </main>

      {/* Detail Modal */}
      {selectedListingId && (
        <ListingDetailModal
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
        />
      )}

      {/* Global Transparency Footer */}
      <footer className="footer">
        <div className="container">
          <div className="disclaimer-box">
            🛡️ <strong>Methodology & Disclosures:</strong> CarX provides evidence-based estimates and comparative intelligence. Model predictions represent statistical asking price central tendencies rather than guaranteed final transaction prices. Physical multi-point inspections and title/RTO verifications should be independently executed before purchasing.
          </div>
          <div style={{ marginTop: "14px" }}>
            © 2026 <strong>CarX Platform</strong> • Engineered for the Indian Automotive Market • Built with Next.js, FastAPI & Google Gemma.
          </div>
        </div>
      </footer>
    </div>
  );
}
