from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = "sqlite:///./carx.db"

    # OpenRouter / Gemma LLM
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "google/gemma-4-26b-a4b-it:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_TIMEOUT_SECONDS: int = 30
    OPENROUTER_MAX_TOKENS: int = 1200

    # Model artifact paths
    MODEL_ARTIFACT_PATH: str = "./models/valuation_model.joblib"
    BASELINE_LOOKUP_PATH: str = "./models/baseline_lookup.json"
    SAMPLE_DATA_PATH: str = "data/sample/listings_sample.json"


settings = Settings()
