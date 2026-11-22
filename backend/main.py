"""
CarX Backend Entry Point for Vercel & Production Deployments.
"""
import sys
import types
from pathlib import Path

# Add backend directory and project root to sys.path
_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent

for p in [str(_backend_dir), str(_project_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]
    backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = backend_pkg
elif not hasattr(sys.modules["backend"], "__path__"):
    sys.modules["backend"].__path__ = [str(_backend_dir)]

try:
    from backend.app.main import app
except Exception as e:
    import traceback
    err_trace = traceback.format_exc()
    import logging
    logging.error(f"FATAL STARTUP ERROR IN backend/main.py: {err_trace}")
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="CarX Fallback Diagnostic API")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def fallback(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "StartupCrash",
                "details": str(e),
                "traceback": err_trace,
            },
        )

__all__ = ["app"]
