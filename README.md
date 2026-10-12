# CarX 🚗
> **Find the Right Car. At the Right Price. In Any City.**

CarX is a production-oriented used-car valuation, search, and cross-city deal intelligence platform tailored specifically for the Indian automotive market.

---

## 🌟 Key Features

1. **Intelligent Used-Car Search**:
   - Multi-dimensional search across Indian makes, models, variants, fuel types (Petrol, Diesel, CNG, EV), transmissions, and cities.
   - Natural language search query parser.

2. **Statistical Fair-Price Valuation Engine**:
   - Dual-tier valuation combining segment median baselines and machine-learning models (Gradient Boosting & XGBoost).
   - Trained on chronological splits with honest metrics (MAE, RMSE, MAPE, $R^2$).
   - Explicit uncertainty bounds and provenance tracking.

3. **Transparent Cross-City Comparison**:
   - Compare equivalent cars across major Indian metros (Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Kolkata).
   - Itemized out-of-pocket costs: Asking Price + Inter-city Transport + Inspection + RTO State Transfer / Re-registration + Road Taxes.
   - Explicit identification of unknown vs estimated costs.

4. **Deal Discovery Engine**:
   - Ranks deals by true valuation discount, condition indicators, mileage-per-year anomalies, and data completeness.
   - Highlights risk flags (e.g. out-of-state NOC required, multiple past owners).

5. **Gemma AI Assistant via OpenRouter**:
   - Conversational assistant powered by Google Gemma.
   - Server-side tool execution (`search_cars`, `estimate_fair_price`, `compare_city_deals`, etc.) with strict schema validation.
   - Completely hallucination-resistant: all computations and searches are performed by backend logic.

---

## 🚀 Quickstart

### Prerequisites
- Python 3.11+ (Python 3.14 supported)
- Node.js 18+ & npm

### Backend Setup
```bash
# In project root
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Run backend API
cd backend
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available at: `http://localhost:8000/docs`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Testing

```bash
# Run backend test suite
source .venv/bin/activate
pytest backend/tests -v
```

---

## 📚 Documentation Directory
- [Architecture & Data Flow](docs/ARCHITECTURE.md)
- [Data Sources & Ingestion](docs/DATA_SOURCES.md)
- [Database & Migrations](docs/DATABASE.md)
- [Valuation ML Pipeline](docs/VALUATION.md)
- [AI Assistant & Tools](docs/AI_ASSISTANT.md)
- [API Reference](docs/API.md)
- [Testing Guidelines](docs/TESTING.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
