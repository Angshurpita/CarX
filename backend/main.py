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

# When running in a Vercel service where backend/ is the root of the deployment,
# create a virtual 'backend' package in sys.modules pointing to _backend_dir
# so that all `from backend.app.*` imports resolve transparently.
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]
    backend_pkg.__file__ = str(_backend_dir / "__init__.py")
    sys.modules["backend"] = backend_pkg

from app.main import app

__all__ = ["app"]
