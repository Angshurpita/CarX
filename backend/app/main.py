import sys
import types
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root and backend dir are always on sys.path
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent.parent
_project_root = _backend_dir.parent
for _p in [str(_backend_dir), str(_project_root)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# When running in a Vercel service where backend/ is the root of the deployment,
# create a virtual 'backend' package in sys.modules pointing to _backend_dir
# so that all `from backend.app.*` imports resolve transparently.
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]
    backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = backend_pkg

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.v1.router import api_router
from backend.app.core.config import settings
from backend.app.db.session import Base, SessionLocal, engine
from backend.app.services.repository import ListingRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed sample data if empty
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            ListingRepository.seed_sample_data_if_empty(db, sample_path=settings.resolved_sample_data_path)
        finally:
            db.close()
    except Exception as exc:
        import logging
        logging.getLogger("carx.main").warning(f"Lifespan initialization notice: {exc}")
    yield
    # Shutdown logic if any


app = FastAPI(
    title="CarX API",
    description="AI-powered Used-Car Valuation, Search & Cross-City Deal Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware: allow all HTTP/HTTPS origins (including Vercel preview URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"])
@app.get("/api/v1/health", tags=["system"])
def health_check():
    """Health check endpoint providing status of API and database connection."""
    from sqlalchemy import text
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"
    finally:
        db.close()

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "carx-backend",
        "database": db_status,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Include v1 API routes
app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "InternalServerError", "message": str(exc) if settings.DEBUG else "An unexpected error occurred"},
    )
