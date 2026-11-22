#!/usr/bin/env bash
set -e

echo "🚗 Starting CarX Development Environment..."

# Activate Virtual Environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Ensure model artifacts exist
if [ ! -f "models/valuation_model.joblib" ]; then
    echo "🧠 Training initial valuation model..."
    PYTHONPATH=. python3 scripts/seed_and_train.py
fi

echo "🚀 Starting FastAPI Backend on http://127.0.0.1:8000..."
uvicorn backend.app.main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

echo "✨ Starting Next.js Frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT

wait
