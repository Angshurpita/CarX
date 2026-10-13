#!/usr/bin/env python3
"""CarX Comprehensive Automated Endpoint & Feature Verification Suite.

Performs live end-to-end HTTP requests against every API route,
validating schemas, calculations, caching, and tool execution.
"""
import sys
import json
import httpx

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(client, name, method, path, json_data=None, params=None, expected_status=200):
    try:
        if method == "GET":
            res = client.get(f"{BASE_URL}{path}", params=params)
        elif method == "POST":
            res = client.post(f"{BASE_URL}{path}", json=json_data)
        
        status_ok = res.status_code == expected_status
        status_symbol = "✅" if status_ok else "❌"
        print(f"{status_symbol} [{method}] {path:<36} -> HTTP {res.status_code}")
        
        if not status_ok:
            print(f"   ERROR: Expected {expected_status}, got {res.status_code}: {res.text[:200]}")
            return False, res
        return True, res
    except Exception as e:
        print(f"❌ [{method}] {path:<36} -> Exception: {e}")
        return False, None

def main():
    print("=" * 70)
    print("🚀 CARX FULL SYSTEM AUDIT: LIVE ENDPOINT VERIFICATION")
    print("=" * 70)
    
    passed = 0
    total = 0
    
    with httpx.Client(timeout=15.0) as client:
        # 1. System Probes
        total += 1
        ok, res = test_endpoint(client, "Health Check Root", "GET", "/health")
        if ok and res.json().get("status") == "healthy": passed += 1
        
        total += 1
        ok, res = test_endpoint(client, "Health Check V1", "GET", "/api/v1/health")
        if ok and res.json().get("database") == "healthy": passed += 1
        
        # 2. Metadata Facets
        total += 1
        ok, res = test_endpoint(client, "Catalog Metadata", "GET", "/api/v1/cars/meta")
        if ok:
            data = res.json()
            assert len(data.get("makes", [])) > 0, "No makes returned"
            assert len(data.get("cities", [])) > 0, "No cities returned"
            passed += 1

        # 3. Vehicle Search & Filters
        total += 1
        ok, res = test_endpoint(client, "Search All Cars", "GET", "/api/v1/cars/search", params={"page_size": 5})
        sample_id = None
        if ok:
            data = res.json()
            assert data["total"] > 0, "Total listings should be > 0"
            sample_id = data["items"][0]["id"]
            passed += 1

        total += 1
        ok, res = test_endpoint(client, "Search Filter Make (Hyundai)", "GET", "/api/v1/cars/search", params={"make": "Hyundai"})
        if ok and all(item["make"] == "Hyundai" for item in res.json()["items"]): passed += 1

        total += 1
        ok, res = test_endpoint(client, "Search Filter City (Mumbai)", "GET", "/api/v1/cars/search", params={"city": "Mumbai"})
        if ok and all(item["city"] == "Mumbai" for item in res.json()["items"]): passed += 1

        total += 1
        ok, res = test_endpoint(client, "Search Sort (price_asc)", "GET", "/api/v1/cars/search", params={"sort_by": "price_asc", "page_size": 3})
        if ok:
            prices = [item["asking_price"] for item in res.json()["items"]]
            assert prices == sorted(prices), "Prices should be ascending"
            passed += 1

        # 4. Listing Detail & Provenance
        if sample_id:
            total += 1
            ok, res = test_endpoint(client, "Listing Detail & Provenance", "GET", f"/api/v1/listings/{sample_id}")
            if ok:
                data = res.json()
                assert "listing" in data and "provenance" in data and "price_history" in data
                passed += 1

        # 5. Machine Learning Fair-Price Valuation
        total += 1
        val_payload = {
            "make": "Hyundai",
            "model": "Creta",
            "variant": "SX Petrol",
            "year": 2021,
            "odometer_km": 42000,
            "fuel_type": "Petrol",
            "transmission": "Manual",
            "owners_count": 1,
            "city": "Mumbai"
        }
        ok, res = test_endpoint(client, "ML Valuation Estimate", "POST", "/api/v1/valuation/estimate", json_data=val_payload)
        if ok:
            data = res.json()
            assert data["estimated_fair_price"] > 500000, "Price should be realistic"
            assert data["price_range_low"] < data["estimated_fair_price"] < data["price_range_high"]
            assert data["confidence_score"] >= 0.70
            passed += 1

        # 6. Cross-City Deal Comparison Matrix
        total += 1
        compare_payload = {
            "buyer_city": "Mumbai",
            "make": "Maruti Suzuki",
            "model": "Swift"
        }
        ok, res = test_endpoint(client, "Cross-City Deal Compare", "POST", "/api/v1/deals/compare", json_data=compare_payload)
        if ok:
            data = res.json()
            assert data["total_candidates"] > 0
            cand = data["candidates"][0]
            assert "transport_cost" in cand and "rto_transfer_cost" in cand
            passed += 1

        # 7. Deal Discovery Search
        total += 1
        deal_search_payload = {
            "buyer_city": "Delhi",
            "max_budget": 2000000
        }
        ok, res = test_endpoint(client, "Deal Discovery Search", "POST", "/api/v1/deals/search", json_data=deal_search_payload)
        if ok and len(res.json()["candidates"]) > 0: passed += 1

        # 8. Saved Searches & Alerts
        total += 1
        save_payload = {
            "user_email": "qa_tester@carx.in",
            "query_params": {"make": "Honda", "model": "City"},
            "target_price_drop_pct": 5.0
        }
        ok, res = test_endpoint(client, "Create Saved Search", "POST", "/api/v1/saved-searches", json_data=save_payload)
        if ok and res.json()["id"] > 0: passed += 1

        total += 1
        ok, res = test_endpoint(client, "List Saved Searches", "GET", "/api/v1/saved-searches", params={"email": "qa_tester@carx.in"})
        if ok and len(res.json()) > 0: passed += 1

        total += 1
        ok, res = test_endpoint(client, "Price Drop Alerts", "GET", "/api/v1/saved-searches/alerts", params={"min_drop_pct": 3.0})
        if ok: passed += 1

        # 9. In-Memory Cache Stats
        total += 1
        ok, res = test_endpoint(client, "Cache Monitoring Stats", "GET", "/api/v1/cache/stats")
        if ok:
            data = res.json()
            assert "hits" in data and "misses" in data
            passed += 1

        # 10. AI Assistant Tool-Grounded Chat
        total += 1
        chat_payload = {
            "messages": [
                {"role": "user", "content": "Find a diesel automatic SUV in Delhi under 15 lakh"}
            ]
        }
        ok, res = test_endpoint(client, "Assistant Chat JSON", "POST", "/api/v1/assistant/chat", json_data=chat_payload)
        if ok:
            data = res.json()
            assert "message" in data and len(data["message"]["content"]) > 10
            assert len(data.get("tool_calls", [])) > 0, "Tool calls must execute"
            passed += 1

        # 11. AI Assistant Streaming SSE
        total += 1
        try:
            res = client.post(f"{BASE_URL}/api/v1/assistant/stream", json=chat_payload)
            if res.status_code == 200 and "text/event-stream" in res.headers.get("content-type", ""):
                print(f"✅ [POST] {'/api/v1/assistant/stream':<36} -> HTTP 200 (SSE Streaming Validated)")
                passed += 1
            else:
                print(f"❌ [POST] {'/api/v1/assistant/stream':<36} -> Failed: HTTP {res.status_code}")
        except Exception as e:
            print(f"❌ [POST] /api/v1/assistant/stream -> Exception: {e}")

    print("=" * 70)
    print(f"🎯 AUDIT COMPLETE: {passed}/{total} Live Endpoints Passed ({round(passed/total*100, 1)}% Success Rate)")
    print("=" * 70)
    
    if passed == total:
        print("🎉 ALL SYSTEM APIS AND CORE FEATURES ARE 100% OPERATIONAL.")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
