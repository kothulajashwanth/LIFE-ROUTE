"""Configuration management for LIFE-ROUTE Backend.

Loads environment variables safely using python-dotenv.
CRITICAL SECURITY RULES:
- Never hardcode credentials.
- Never log or print SUPABASE_SECRET_KEY.
- Never expose SUPABASE_SECRET_KEY through API responses.
"""

import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Load .env if present in root directory
root_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings loaded from environment."""

    def __init__(self):
        self.APP_ENV: str = os.getenv("APP_ENV", "development")
        self.APP_NAME: str = os.getenv("APP_NAME", "LIFE-ROUTE")
        self.BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
        self.BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
        self.BACKEND_URL: str = os.getenv("BACKEND_URL", f"http://{self.BACKEND_HOST}:{self.BACKEND_PORT}")

        # CORS Origins
        raw_origins = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
        )
        self.CORS_ORIGINS: List[str] = [o.strip() for o in raw_origins.split(",") if o.strip()]

        # Data directories
        self.PROJECT_ROOT: Path = root_dir
        self.DATA_DIR: Path = root_dir / os.getenv("DATA_DIR", "dataset")
        self.PROCESSED_DATA_DIR: Path = self.DATA_DIR / "processed"
        self.RAW_DATA_DIR: Path = self.DATA_DIR / "raw"

        # Database fallback
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./liferoute.db")

        # Supabase credentials (optional / fallback local)
        self.SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL") or None
        self.SUPABASE_PUBLISHABLE_KEY: Optional[str] = os.getenv("SUPABASE_PUBLISHABLE_KEY") or None
        self._SUPABASE_SECRET_KEY: Optional[str] = os.getenv("SUPABASE_SECRET_KEY") or None

    @property
    def has_supabase(self) -> bool:
        """Check if Supabase is configured without exposing keys."""
        return bool(self.SUPABASE_URL and (self.SUPABASE_PUBLISHABLE_KEY or self._SUPABASE_SECRET_KEY))

    def get_safe_dict(self) -> dict:
        """Return configuration dictionary with all secrets strictly redacted."""
        return {
            "app_name": self.APP_NAME,
            "app_env": self.APP_ENV,
            "backend_url": self.BACKEND_URL,
            "cors_origins": self.CORS_ORIGINS,
            "database_url": "sqlite:///./liferoute.db" if "sqlite" in self.DATABASE_URL else "[REDACTED_DB_URL]",
            "supabase_configured": self.has_supabase,
            "supabase_url": self.SUPABASE_URL,
            "supabase_publishable_key_set": bool(self.SUPABASE_PUBLISHABLE_KEY),
            "supabase_secret_key_set": bool(self._SUPABASE_SECRET_KEY),
        }

    def get_secret_key(self) -> Optional[str]:
        """Internal getter for secret key. NEVER expose through API endpoints."""
        return self._SUPABASE_SECRET_KEY


settings = Settings()
