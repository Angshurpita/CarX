"""
CarX Backend Entry Point for Vercel & Production Deployments.
Exposes 'app' and 'handler' at the module's top level for Vercel Python runtime discovery.
"""
import os
import sys
import types
from pathlib import Path

# Add backend directory and project root to sys.path
_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent

for _p in [str(_backend_dir), str(_project_root)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Ensure virtual 'backend' package exists so 'backend.app.*' imports resolve transparently
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]
    backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = backend_pkg
elif not hasattr(sys.modules["backend"], "__path__"):
    sys.modules["backend"].__path__ = [str(_backend_dir)]

try:
    from backend.app.main import app as _app
except ImportError:
    from app.main import app as _app

# Top-level ASGI application instance for Vercel and ASGI servers
app = _app
handler = app

__all__ = ["app", "handler"]
