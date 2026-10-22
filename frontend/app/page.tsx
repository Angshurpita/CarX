"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ListingCard from "../components/ListingCard";
import ListingDetailModal from "../components/ListingDetailModal";
import ValuationCalculator from "../components/ValuationCalculator";
import CrossCityComparisonView from "../components/CrossCityComparisonView";
import AssistantChat from "../components/AssistantChat";
import { fetchCars, fetchMetadata, MetadataFacets, NormalizedListing } from "../lib/api";

const TOP_METROS = [
  "All India",
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Chandigarh",
  "Kochi",
];

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  label: string;
  city: string;
  naturalQuery: string;
  make: string;
  fuel: string;
  transmission: string;
  bodyStyle: string;
  maxPrice: string;
}

const MAX_SEARCH_HISTORY = 10;
const SEARCH_HISTORY_KEY = "carx_recent_searches_v1";

export default function Home() {
  const [activeTab, setActiveTabState] = useState("inventory");

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("carx_active_tab");
      if (savedTab) {
        setActiveTabState(savedTab);
      }
    } catch (e) {
      console.warn("Failed to read active tab", e);
    }
  }, []);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem("carx_active_tab", tab);
    } catch (e) {
      console.warn("Failed to save active tab", e);
    }
  };

  // City & Search Filter States
  const [cityInput, setCityInput] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedFuel, setSelectedFuel] = useState("");
  const [selectedTrans, setSelectedTrans] = useState("");
  const [selectedBody, setSelectedBody] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);

  // Search History State (up to 10 items)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Data States
  const [listings, setListings] = useState<NormalizedListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metadata, setMetadata] = useState<MetadataFacets | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Cross-City selection
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [compareTarget, setCompareTarget] = useState<{ make: string; model: string }>({
    make: "",
    model: "",
  });

  // Load Metadata once
  useEffect(() => {
    fetchMetadata()
      .then((m) => setMetadata(m))
      .catch((err) => console.error("Metadata load error", err));
  }, []);

  // Load Search History on mount (up to 10 max)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed: SearchHistoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSearchHistory(parsed.slice(0, MAX_SEARCH_HISTORY));
        }
      }
    } catch (e) {
      console.warn("Failed to read search history from localStorage", e);
    }
  }, []);

  const saveSearchToHistory = (entry: {
    city?: string;
    naturalQuery?: string;
    make?: string;
    fuel?: string;
    transmission?: string;
    bodyStyle?: string;
    maxPrice?: string;
  }) => {
    const city = entry.city || "";
    const nq = (entry.naturalQuery || "").trim();
    const make = entry.make || "";
    const fuel = entry.fuel || "";
    const transmission = entry.transmission || "";
    const bodyStyle = entry.bodyStyle || "";
    const maxPriceVal = entry.maxPrice || "";

    let label = "";
    if (nq) {
      label = city ? `${city} • "${nq}"` : `"${nq}"`;
    } else {
      const parts: string[] = [];
      if (city) parts.push(city);
      if (make) parts.push(make);
      if (bodyStyle) parts.push(bodyStyle);
      if (fuel) parts.push(fuel);
      if (transmission) parts.push(transmission);
      if (maxPriceVal) {
        const lk = Number(maxPriceVal) / 100000;
        parts.push(`≤₹${lk}L`);
      }
      label = parts.length > 0 ? parts.join(" • ") : "All India Catalog";
    }

    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.label.toLowerCase() !== label.toLowerCase());
      const newItem: SearchHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        label,
        city,
        naturalQuery: nq,
        make,
        fuel,
        transmission,
        bodyStyle,
        maxPrice: maxPriceVal,
      };
      const updated = [newItem, ...filtered].slice(0, MAX_SEARCH_HISTORY);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist search history", e);
      }
      return updated;
    });
  };

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

  // Handle City Selection
  const handleCitySelect = (city: string) => {
    const newCity = city === "All India" ? "" : city;
    setSelectedCity(newCity);
    setCityInput(newCity);
    setPage(1);
    setActiveTab("inventory");

    saveSearchToHistory({
      city: newCity,
      make: selectedMake,
      fuel: selectedFuel,
      transmission: selectedTrans,
      bodyStyle: selectedBody,
      maxPrice,
      naturalQuery,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newCity = selectedCity;
    const queryCity = cityInput.trim().toLowerCase();

    if (!queryCity || queryCity === "all" || queryCity === "all india") {
      newCity = "";
      setSelectedCity("");
    } else {
      const match = TOP_METROS.find((m) => m.toLowerCase().includes(queryCity));
      if (match && match !== "All India") {
        newCity = match;
        setSelectedCity(match);
        setCityInput(match);
      } else {
        newCity = cityInput.trim();
        setSelectedCity(newCity);
      }
    }

    let newFuel = selectedFuel;
    let newTrans = selectedTrans;
    let newBody = selectedBody;
    let newMake = selectedMake;
    let newMaxPrice = maxPrice;

    if (naturalQuery.trim()) {
      const q = naturalQuery.toLowerCase();
      if (q.includes("diesel")) newFuel = "Diesel";
      else if (q.includes("petrol")) newFuel = "Petrol";
      else if (q.includes("cng")) newFuel = "CNG";
      else if (q.includes("electric") || q.includes("ev")) newFuel = "Electric";

      if (q.includes("auto")) newTrans = "Automatic";
      else if (q.includes("manual")) newTrans = "Manual";

      if (q.includes("suv")) newBody = "SUV";
      else if (q.includes("sedan")) newBody = "Sedan";
      else if (q.includes("hatchback")) newBody = "Hatchback";

      if (q.includes("mumbai")) { newCity = "Mumbai"; setCityInput("Mumbai"); }
      else if (q.includes("delhi")) { newCity = "Delhi"; setCityInput("Delhi"); }
      else if (q.includes("bengaluru") || q.includes("bangalore")) { newCity = "Bengaluru"; setCityInput("Bengaluru"); }
      else if (q.includes("hyderabad")) { newCity = "Hyderabad"; setCityInput("Hyderabad"); }
      else if (q.includes("kolkata")) { newCity = "Kolkata"; setCityInput("Kolkata"); }
      else if (q.includes("pune")) { newCity = "Pune"; setCityInput("Pune"); }

      if (q.includes("thar") || q.includes("scorpio") || q.includes("xuv") || q.includes("bolero")) { newMake = "Mahindra"; }
      else if (q.includes("fortuner") || q.includes("innova") || q.includes("hyryder") || q.includes("glanza")) { newMake = "Toyota"; }
      else if (q.includes("safari") || q.includes("harrier") || q.includes("nexon") || q.includes("punch") || q.includes("altroz") || q.includes("tiago")) { newMake = "Tata"; }
      else if (q.includes("creta") || q.includes("venue") || q.includes("verna") || q.includes("i20") || q.includes("exter") || q.includes("alcazar")) { newMake = "Hyundai"; }
      else if (q.includes("seltos") || q.includes("sonet") || q.includes("carens") || q.includes("carnival")) { newMake = "Kia"; }
      else if (q.includes("swift") || q.includes("baleno") || q.includes("brezza") || q.includes("vitara") || q.includes("fronx") || q.includes("dzire") || q.includes("ertiga")) { newMake = "Maruti Suzuki"; }
      else if (q.includes("city") || q.includes("elevate") || q.includes("amaze")) { newMake = "Honda"; }
      else if (q.includes("virtus") || q.includes("taigun") || q.includes("polo")) { newMake = "Volkswagen"; }
      else if (q.includes("slavia") || q.includes("kushaq") || q.includes("octavia") || q.includes("superb")) { newMake = "Skoda"; }
      else if (q.includes("bmw")) { newMake = "BMW"; }
      else if (q.includes("mercedes")) { newMake = "Mercedes-Benz"; }
      else if (q.includes("audi")) { newMake = "Audi"; }

      const lakhMatch = q.match(/(\d+)\s*(lakh|lac|l)/);
      if (lakhMatch) {
        newMaxPrice = String(Number(lakhMatch[1]) * 100000);
      }

      setSelectedFuel(newFuel);
      setSelectedTrans(newTrans);
      setSelectedBody(newBody);
      setSelectedMake(newMake);
      setMaxPrice(newMaxPrice);
    }

    setPage(1);
    setActiveTab("inventory");

    saveSearchToHistory({
      city: newCity,
      naturalQuery,
      make: newMake,
      fuel: newFuel,
      transmission: newTrans,
      bodyStyle: newBody,
      maxPrice: newMaxPrice,
    });
  };

  const handleApplyHistoryItem = (item: SearchHistoryItem) => {
    setSelectedCity(item.city);
    setCityInput(item.city);
    setNaturalQuery(item.naturalQuery);
    setSelectedMake(item.make);
    setSelectedFuel(item.fuel);
    setSelectedTrans(item.transmission);
    setSelectedBody(item.bodyStyle);
    setMaxPrice(item.maxPrice);
    setPage(1);
    setActiveTab("inventory");

    // Move to front of history
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== item.id);
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered];
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to reorder search history", e);
      }
      return updated;
    });
  };

  const handleRemoveHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to remove search history item", err);
      }
      return updated;
    });
  };

  const handleClearSearchHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {
      console.warn("Failed to clear search history", e);
    }
  };

  const resetFilters = () => {
    setSelectedMake("");
    setSelectedCity("");
    setCityInput("");
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

      <main className="container" style={{ flex: 1, paddingTop: "20px" }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-pill">
            AI-Calibrated Indian Used-Car Intelligence Platform
          </div>
          <h1 className="hero-title">
            Find the Right Car. <br />
            <span className="gradient-text">At the Right Price. In Any City.</span>
          </h1>
          <p className="hero-subtitle">
            Combines verified market feeds from CarWale, OLX, and Cars24, machine-learning fair asking price estimation, inter-metro transport logistics, and an AI conversational advisor.
          </p>
        </section>

        {/* =========================================================
            PRIMARY INITIAL INTERFACE: CITY FIRST & BROWSING HUB
            (Entering city name, quick city selector & filters)
           ========================================================= */}
        <section className="city-search-hub">
          <div className="city-hub-header">
            <div className="city-hub-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Select or Enter City to Browse Cars</span>
            </div>

            <div className="city-status-badge">
              <span className="city-status-dot" />
              <span>
                {selectedCity ? `Browsing ${selectedCity} (${totalCount} Vehicles)` : `All-India Catalog (${totalCount} Vehicles)`}
              </span>
            </div>
          </div>

          {/* Quick Select City Pills */}
          <div className="city-pills-row">
            {TOP_METROS.map((city) => {
              const isSelected = (!selectedCity && city === "All India") || selectedCity === city;
              return (
                <button
                  key={city}
                  type="button"
                  className={`city-pill-btn ${isSelected ? "active" : ""}`}
                  onClick={() => handleCitySelect(city)}
                >
                  {city}
                </button>
              );
            })}
          </div>

          {/* City Entry Bar & Keyword Search */}
          <form className="city-search-bar" onSubmit={handleSearchSubmit}>
            <div className="liquid-input-wrapper">
              <div className="liquid-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="city-text-input"
                className="liquid-input"
                type="text"
                placeholder="Enter city name..."
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
              />
            </div>

            <div className="liquid-input-wrapper">
              <div className="liquid-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <input
                id="natural-search-input"
                className="liquid-input"
                type="text"
                placeholder="Search by model, fuel, or keywords..."
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
              />
            </div>

            <button id="city-search-submit" type="submit" className="liquid-btn-primary">
              Browse Vehicles
            </button>
          </form>

          {/* =========================================================
              SEARCH HISTORY: UP TO 10 SAVED SEARCHES (PERSISTENT)
             ========================================================= */}
          <div className="recent-searches-box">
            <div className="recent-searches-header">
              <div className="recent-searches-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Recent Searches</span>
                <span className="recent-searches-count">{searchHistory.length}/{MAX_SEARCH_HISTORY}</span>
              </div>

              {searchHistory.length > 0 && (
                <button
                  id="clear-all-searches-btn"
                  type="button"
                  className="recent-searches-clear-btn"
                  onClick={handleClearSearchHistory}
                  title="Clear all recent searches"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear History
                </button>
              )}
            </div>

            {searchHistory.length > 0 ? (
              <div className="recent-searches-chips-row">
                {searchHistory.map((item) => {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="recent-search-chip"
                      onClick={() => handleApplyHistoryItem(item)}
                      title={`Restore search: ${item.label}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "var(--liquid-blue)" }}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>{item.label}</span>
                      <span
                        className="recent-search-chip-remove"
                        onClick={(e) => handleRemoveHistoryItem(item.id, e)}
                        title="Remove from history"
                      >
                        ×
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="recent-searches-empty">
                Your searches (up to 10) will be automatically saved here for quick one-click access.
              </div>
            )}
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
                  type="button"
                  className="liquid-btn-secondary"
                  style={{ fontSize: "0.76rem", padding: "4px 10px" }}
                  onClick={resetFilters}
                >
                  Reset
                </button>
              </div>

              {/* Brand / Make Filter */}
              <div className="filter-group">
                <label className="filter-label">Brand / Make</label>
                <select
                  id="filter-make"
                  className="filter-select"
                  value={selectedMake}
                  onChange={(e) => { setSelectedMake(e.target.value); setPage(1); }}
                >
                  <option value="">All Brands</option>
                  {(metadata?.makes || [
                    "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Toyota", "Kia", "Honda", "Volkswagen", "Skoda", "MG", "Jeep", "BMW", "Mercedes-Benz", "Audi"
                  ]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Body Style Filter */}
              <div className="filter-group">
                <label className="filter-label">Body Style</label>
                <select
                  id="filter-body"
                  className="filter-select"
                  value={selectedBody}
                  onChange={(e) => { setSelectedBody(e.target.value); setPage(1); }}
                >
                  <option value="">All Body Styles</option>
                  <option value="SUV">SUV</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="MUV">MUV</option>
                  <option value="Luxury">Luxury</option>
                </select>
              </div>

              {/* Fuel Type */}
              <div className="filter-group">
                <label className="filter-label">Fuel Type</label>
                <select
                  id="filter-fuel"
                  className="filter-select"
                  value={selectedFuel}
                  onChange={(e) => { setSelectedFuel(e.target.value); setPage(1); }}
                >
                  <option value="">All Fuels</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>

              {/* Transmission */}
              <div className="filter-group">
                <label className="filter-label">Transmission</label>
                <select
                  id="filter-transmission"
                  className="filter-select"
                  value={selectedTrans}
                  onChange={(e) => { setSelectedTrans(e.target.value); setPage(1); }}
                >
                  <option value="">All Transmissions</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>

              {/* Max Budget */}
              <div className="filter-group">
                <label className="filter-label">Maximum Budget</label>
                <select
                  id="filter-price"
                  className="filter-select"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                >
                  <option value="">Any Budget</option>
                  <option value="500000">Under ₹5 Lakh</option>
                  <option value="800000">Under ₹8 Lakh</option>
                  <option value="1200000">Under ₹12 Lakh</option>
                  <option value="1800000">Under ₹18 Lakh</option>
                  <option value="2500000">Under ₹25 Lakh</option>
                  <option value="4000000">Under ₹40 Lakh</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="filter-group">
                <label className="filter-label">Sort Order</label>
                <select
                  id="filter-sort"
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                >
                  <option value="date_desc">Latest Observed</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="km_asc">Lowest Kilometers</option>
                  <option value="year_desc">Newest Model Year</option>
                </select>
              </div>
            </aside>

            {/* Listings Grid */}
            <section style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                  Showing <strong style={{ color: "var(--text-main)" }}>{listings.length}</strong> of <strong style={{ color: "var(--text-main)" }}>{totalCount}</strong> verified vehicles
                  {selectedCity && <span> in <strong style={{ color: "var(--liquid-blue)" }}>{selectedCity}</strong></span>}
                </div>
              </div>

              {loading ? (
                <div className="glass-panel" style={{ padding: "80px 20px", textAlign: "center", color: "var(--liquid-blue)" }}>
                  Loading verified vehicles...
                </div>
              ) : listings.length === 0 ? (
                <div className="glass-panel" style={{ padding: "80px 20px", textAlign: "center" }}>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "8px" }}>No Vehicles Match Your Current Filters</h3>
                  <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
                    Try selecting another city, increasing your budget limit, or clearing filters.
                  </p>
                  <button type="button" className="liquid-btn-primary" onClick={resetFilters}>
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="cards-grid">
                  {listings.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      onSelect={(car) => setSelectedListingId(car.id)}
                      onCompareCity={handleCardCompare}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "40px" }}>
                  <button
                    className="liquid-btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous Page
                  </button>
                  <span style={{ display: "flex", alignItems: "center", color: "var(--text-muted)", fontSize: "0.9rem", padding: "0 12px" }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="liquid-btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next Page
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 2: Cross-City Arbitrage Deals */}
        {activeTab === "crosscity" && (
          <CrossCityComparisonView
            initialMake={compareTarget.make}
            initialModel={compareTarget.model}
          />
        )}

        {/* Tab 3: Fair-Price Valuation Estimator */}
        {activeTab === "valuation" && <ValuationCalculator />}

        {/* Tab 4: AI Automotive Advisor */}
        {activeTab === "assistant" && <AssistantChat />}
      </main>

      {/* Listing Detail & Provenance Audit Modal */}
      {selectedListingId && (
        <ListingDetailModal
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
        />
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-glass)", background: "#ffffff", padding: "28px 0", marginTop: "60px" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", fontSize: "0.84rem", color: "var(--text-dim)" }}>
          <div>
            CarX Intelligence Platform • Verified Indian Used-Car Valuations & Cross-City Logistics
          </div>
          <div>
            Data calibrated from verified CarWale, OLX, and Cars24 portal feeds.
          </div>
        </div>
      </footer>
    </div>
  );
}
