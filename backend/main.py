"""
CarX Backend Entry Point for Vercel & Production Deployments.
"""
import sys
from pathlib import Path

# Add backend directory and project root to sys.path
_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent

for p in [str(_backend_dir), str(_project_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.main import app

__all__ = ["app"]
