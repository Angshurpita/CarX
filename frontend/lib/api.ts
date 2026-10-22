/**
 * CarX API Client
 * Interacts with FastAPI backend endpoints on http://localhost:8000/api/v1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export interface NormalizedListing {
  id: string;
  provider_name: string;
  source_listing_id: string;
  source_url: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  asking_price: number;
  currency: string;
  odometer_km: number;
  fuel_type: string;
  transmission: string;
  body_style: string;
  owners_count: number;
  city: string;
  state: string;
  seller_type: string;
  listing_status: string;
  is_demo: boolean;
  match_confidence: number;
  first_observed_at: string;
  last_observed_at: string;
  age_years?: number;
  image_url?: string;
}

export interface ListingSearchResult {
  items: NormalizedListing[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MetadataFacets {
  makes: string[];
  cities: string[];
  body_styles: string[];
  fuel_types: string[];
  transmissions: string[];
  price_range: { min: number; max: number };
  year_range: { min: number; max: number };
}

export interface ValuationRequest {
  make: string;
  model: string;
  variant?: string;
  year: number;
  odometer_km: number;
  fuel_type: string;
  transmission: string;
  owners_count?: number;
  city: string;
  body_style?: string;
}

export interface MarketTrendsInfo {
  demand_level: string;
  demand_score: number;
  resale_retention_pct: number;
  annual_depreciation_pct: number;
  typical_days_to_sell: string;
  market_trend_summary: string;
  regulatory_advisory?: string | null;
}

export interface PriceBreakdownInfo {
  dealer_trade_in: number;
  private_party: number;
  certified_retail: number;
}

export interface ValuationFactor {
  label: string;
  impact: string;
  type: "positive" | "negative" | "neutral" | "critical";
  description: string;
}

export interface PortalBenchmarkItem {
  name: string;
  url: string;
  estimated_range: string;
}

export interface ValuationResponse {
  estimated_fair_price: number;
  price_range_low: number;
  price_range_high: number;
  baseline_median_price: number;
  model_version: string;
  confidence_score: number;
  currency: string;
  data_freshness: string;
  prediction_provenance: any;
  disclaimer: string;
  market_trends?: MarketTrendsInfo;
  price_breakdown?: PriceBreakdownInfo;
  valuation_factors?: ValuationFactor[];
  portal_benchmarks?: Record<string, PortalBenchmarkItem>;
  ai_engine?: string;
}

export interface DealCompareCandidate {
  listing_id: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  odometer_km: number;
  fuel_type: string;
  transmission: string;
  city: string;
  state: string;
  asking_price: number;
  estimated_fair_price: number;
  price_difference: number;
  discount_pct: number;
  match_confidence: number;
  match_tier: string;
  distance_km: number;
  transport_cost: number;
  inspection_cost: number;
  rto_transfer_cost: number;
  estimated_total_purchase_cost: number;
  deal_score: number;
  net_benefit_vs_local?: number;
  deal_verdict: string;
  recommendation_reasons: string[];
  risk_flags: string[];
  cost_breakdown: Array<{ label: string; amount: number; type: string }>;
  source_url: string;
}

export interface DealCompareResponse {
  buyer_city: string;
  total_candidates: number;
  best_deal_listing_id?: string;
  candidates: DealCompareCandidate[];
  disclaimer: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
  tool_calls: Array<{ name: string; arguments: any; result: any }>;
  model_used: string;
  provider_status: string;
}

/* API Calls */

export async function fetchMetadata(): Promise<MetadataFacets> {
  const res = await fetch(`${API_BASE_URL}/cars/meta`);
  if (!res.ok) throw new Error("Failed to load catalog metadata");
  return res.json();
}

export async function fetchCars(params: Record<string, any> = {}): Promise<ListingSearchResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      query.append(k, String(v));
    }
  });
  const res = await fetch(`${API_BASE_URL}/cars/search?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to search vehicles");
  return res.json();
}

export async function fetchListingDetail(id: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/listings/${id}`);
  if (!res.ok) throw new Error(`Listing ${id} not found`);
  return res.json();
}

export async function estimateFairPrice(req: ValuationRequest): Promise<ValuationResponse> {
  const res = await fetch(`${API_BASE_URL}/valuation/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Valuation calculation failed");
  return res.json();
}

export async function compareCityDeals(buyerCity: string, make: string, model: string): Promise<DealCompareResponse> {
  const res = await fetch(`${API_BASE_URL}/deals/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyer_city: buyerCity, make, model }),
  });
  if (!res.ok) throw new Error("Cross-city deal comparison failed");
  return res.json();
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Assistant response failed");
  return res.json();
}

export async function streamChatMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onTool: (tool: any) => void,
  onDone: () => void,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/assistant/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Assistant streaming connection failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let isDone = false;
  const finish = () => {
    if (!isDone) {
      isDone = true;
      onDone();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.type === "token") {
            onToken(payload.token);
          } else if (payload.type === "tool") {
            onTool(payload.tool);
          } else if (payload.type === "done") {
            finish();
          }
        } catch {
          // Ignore partial chunk parsing
        }
      }
    }
  }
  finish();
}
