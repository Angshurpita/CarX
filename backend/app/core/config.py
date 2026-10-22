import os
import shutil
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent.parent.parent  # .../backend
_project_root = _backend_dir.parent               # .../CarX


def _resolve_asset_path(default_rel: str, candidates: List[Path]) -> str:
    """Finds an existing asset file from candidate locations, falling back to the first candidate."""
    for c in candidates:
        if c.exists():
            return str(c.resolve())
    return str(Path(default_rel).resolve())


def _resolve_database_url(raw_url: str) -> str:
    """Configures SQLite safely for Vercel and serverless read-only filesystems using /tmp."""
    is_serverless = os.getenv("VERCEL") == "1" or bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless and raw_url.startswith("sqlite"):
        tmp_db = Path("/tmp/carx.db")
        if not tmp_db.exists() or tmp_db.stat().st_size == 0:
            for src in [
                _backend_dir / "carx.db",
                _project_root / "carx.db",
                Path("carx.db").resolve(),
            ]:
                if src.exists() and src.stat().st_size > 0:
                    try:
                        shutil.copy2(src, tmp_db)
                        break
                    except Exception:
                        pass
        return "sqlite:////tmp/carx.db"
    return raw_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = ["*"]

    # Database
    DATABASE_URL: str = "sqlite:///./carx.db"

    # OpenRouter / Gemma LLM
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "google/gemma-4-26b-a4b-it:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_TIMEOUT_SECONDS: int = 30
    OPENROUTER_MAX_TOKENS: int = 1200

    # Google Gemini Direct API Configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    # Model artifact paths
    MODEL_ARTIFACT_PATH: str = "./models/valuation_model.joblib"
    BASELINE_LOOKUP_PATH: str = "./models/baseline_lookup.json"
    SAMPLE_DATA_PATH: str = "data/sample/listings_sample.json"

    @property
    def resolved_database_url(self) -> str:
        return _resolve_database_url(self.DATABASE_URL)

    @property
    def resolved_model_path(self) -> str:
        return _resolve_asset_path(
            "models/valuation_model_light.json",
            [
                _backend_dir / "models" / "valuation_model_light.json",
                _project_root / "models" / "valuation_model_light.json",
                Path(self.MODEL_ARTIFACT_PATH),
                _backend_dir / "models" / "valuation_model.joblib",
                _project_root / "models" / "valuation_model.joblib",
            ],
        )

    @property
    def resolved_baseline_lookup_path(self) -> str:
        return _resolve_asset_path(
            self.BASELINE_LOOKUP_PATH,
            [
                Path(self.BASELINE_LOOKUP_PATH),
                _backend_dir / "models" / "baseline_lookup.json",
                _project_root / "models" / "baseline_lookup.json",
            ],
        )

    @property
    def resolved_valuation_meta_path(self) -> str:
        return _resolve_asset_path(
            "models/valuation_metadata.json",
            [
                Path("models/valuation_metadata.json"),
                _backend_dir / "models" / "valuation_metadata.json",
                _project_root / "models" / "valuation_metadata.json",
            ],
        )

    @property
    def resolved_sample_data_path(self) -> str:
        return _resolve_asset_path(
            self.SAMPLE_DATA_PATH,
            [
                Path(self.SAMPLE_DATA_PATH),
                _backend_dir / "data" / "sample" / "listings_sample.json",
                _project_root / "data" / "sample" / "listings_sample.json",
            ],
        )


settings = Settings()
