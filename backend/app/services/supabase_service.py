"""Supabase Connectivity Service with Local Fallback.

Safely initializes Supabase client when configured, without failing or crashing
if credentials or network are offline. Falls back to local SQLite storage.
CRITICAL: Never logs or returns secret keys.
"""

from typing import Dict, Any, Optional
import logging
from backend.app.config import settings

logger = logging.getLogger("liferoute.supabase")


class SupabaseService:
    """Manages Supabase client connectivity safely."""

    def __init__(self):
        self.client = None
        self._is_connected = False
        self._init_client()

    def _init_client(self) -> None:
        """Initialize client safely if credentials exist and package is available."""
        if not settings.has_supabase:
            logger.info("Supabase credentials not fully configured; using local fallback.")
            return

        try:
            from supabase import create_client, Client
            key = settings.get_secret_key() or settings.SUPABASE_PUBLISHABLE_KEY
            if settings.SUPABASE_URL and key:
                self.client: Optional[Client] = create_client(settings.SUPABASE_URL, key)
                self._is_connected = True
                logger.info("Supabase client initialized successfully.")
        except ImportError:
            logger.warning("supabase-py package not available; using local fallback.")
        except Exception as e:
            logger.warning("Supabase connection initialization failed: %s; using local fallback.", type(e).__name__)

    def get_status(self) -> Dict[str, Any]:
        """Return connectivity status without exposing sensitive credentials."""
        return {
            "configured": settings.has_supabase,
            "connected": self._is_connected,
            "url": settings.SUPABASE_URL,
            "publishable_key_set": bool(settings.SUPABASE_PUBLISHABLE_KEY),
            "secret_key_set": bool(settings.get_secret_key()),
            "storage_mode": "supabase" if self._is_connected else "local_sqlite_fallback",
            "local_database_url": "sqlite:///./liferoute.db",
        }


supabase_service = SupabaseService()
