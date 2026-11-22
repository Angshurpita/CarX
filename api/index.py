"""
CarX Vercel Serverless Function Entry Point.
Native serverless execution for FastAPI on Vercel deployments.
"""
import os
import sys
import types
from pathlib import Path

# Add project root and backend dir to sys.path
_current_dir = Path(__file__).resolve().parent
_project_root = _current_dir.parent
_backend_dir = _project_root / "backend"

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
    logging.error(f"FATAL STARTUP ERROR IN api/index.py: {err_trace}")
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
                "project_root": str(_project_root),
                "backend_dir": str(_backend_dir),
                "backend_exists": _backend_dir.exists(),
                "files_in_root": [f.name for f in _project_root.glob("*")] if _project_root.exists() else [],
            },
        )

__all__ = ["app"]
