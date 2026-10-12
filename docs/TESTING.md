# CarX Testing Strategy & Test Execution

## 1. Testing Philosophy

1. **No External Network Dependencies in Unit/Integration Suites**:
   - Tests do not make real paid calls to OpenRouter or external websites.
   - External providers and LLM HTTP responses are mocked via deterministic fixtures.
2. **Deterministic Calculations**:
   - Cost formulas, vehicle matching scores, and discount logic have zero tolerance for randomness.
3. **Data Quality & Ingestion Testing**:
   - Duplicate detection, missing fields, corrupted dates, and invalid prices are verified.

## 2. Test Execution Commands

### Backend Tests
```bash
# Run all backend tests
cd /Users/angshurpitaganguly/Desktop/CarX
source .venv/bin/activate
pytest backend/tests -v

# Run with coverage
pytest backend/tests --cov=backend/app -v
```

### Frontend Tests
```bash
cd /Users/angshurpitaganguly/Desktop/CarX/frontend
npm test
```
