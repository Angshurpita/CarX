"""
CarX Vercel Serverless Function Entry Point.
Enables native serverless execution for FastAPI on standard Vercel deployments.
"""
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

# Create virtual 'backend' package in sys.modules if needed
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]
    backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = backend_pkg

from backend.app.main import app

__all__ = ["app"]
