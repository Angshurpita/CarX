# CarX Deployment & Operations Guide

## 1. Vercel Single-Deployment Monorepo Setup (Recommended)

CarX is configured as a **single-deployment full-stack monorepo** on [Vercel](https://vercel.com).
With a single deployment, Vercel hosts both the Next.js frontend and the FastAPI backend service under a unified domain, eliminating CORS headaches and multi-project synchronization overhead.

### How it Works
1. **Unified Routing (`vercel.json`)**:
   - `services.frontend`: Deploys the Next.js app in `frontend/`.
   - `services.backend`: Deploys the FastAPI application in `backend/` via entrypoint `main:app`.
   - Top-level `rewrites`:
     - `/api/v1/:path*` ➔ `backend`
     - `/health` ➔ `backend`
     - `/docs`, `/redoc`, `/openapi.json` ➔ `backend`
     - `/(.*)` ➔ `frontend`
2. **Dynamic Asset & Serverless DB Handling**:
   - `backend/app/core/config.py` automatically detects when running in Vercel (`VERCEL=1`).
   - In serverless environments with a read-only root directory, SQLite is copied to `/tmp/carx.db` on cold boot so read/write queries and table creation succeed without read-only filesystem errors.
   - For persistent production traffic, you can supply a PostgreSQL URL (e.g. Supabase, Neon, or Vercel Postgres) via `DATABASE_URL`.
   - Pre-trained valuation ML models (`models/valuation_model.joblib`, `models/baseline_lookup.json`) and datasets are mirrored inside `backend/` and tracked in Git for instant cold starts.

---

### Deploying to Vercel in 3 Steps

#### Step 1: Push Repository to GitHub / GitLab / Bitbucket
Ensure all tracked files (including `vercel.json`, `package.json`, `backend/`, and `frontend/`) are pushed to your remote git repository.

#### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New..."** ➔ **"Project"**.
2. Select your `CarX` repository and click **Import**.
3. **Leave Root Directory as `./`** (the project root contains `vercel.json` which orchestrates both frontend and backend).

#### Step 3: Configure Environment Variables
In the Vercel deployment screen (or under **Project Settings ➔ Environment Variables**), add:

| Variable | Recommended Value | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Your OpenRouter API key for Gemma assistant |
| `DATABASE_URL` | *(Optional)* | PostgreSQL connection URL (defaults to zero-config SQLite `/tmp/carx.db`) |
| `VERCEL_SUPPORT_LARGE_FUNCTIONS` | `1` | Enables Vercel Fluid Compute large functions (up to 5GB) for ML dependencies |
| `GEMINI_API_KEY` | *(Optional)* | Direct Google Gemini API key if using Gemini instead of OpenRouter |

Click **Deploy**!
Once deployed, Vercel will provide your production URL (e.g., `https://carx-app.vercel.app`).
- Frontend UI: `https://your-domain.vercel.app/`
- API Health Check: `https://your-domain.vercel.app/health` or `https://your-domain.vercel.app/api/v1/health`
- Interactive Swagger API Docs: `https://your-domain.vercel.app/docs`

---

## 2. Local Development

### Option A: Using Vercel CLI (Simulates Production)
```bash
# Install Vercel CLI globally
npm i -g vercel

# In project root
vercel dev
```
Both the Next.js frontend and FastAPI backend run concurrently on `http://localhost:3000`.

### Option B: Running Independently
1. **Backend**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   cd backend
   uvicorn main:app --reload --port 8000
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Next.js proxies `/api/v1/*` calls to `http://127.0.0.1:8000` via rewrites configured in `frontend/next.config.ts`.

---

## 3. Alternative: Docker / Container Deployment

CarX can also be containerized into lightweight containers:
- **Backend**: Python 3.12 container running `uvicorn app.main:app --workers 4`.
- **Frontend**: Node 20/22 container running `npm run build && npm start`.
- **Database**: Managed PostgreSQL instance with automated backups.
