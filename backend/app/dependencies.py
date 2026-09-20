"""FastAPI Dependencies for LIFE-ROUTE Backend."""

from backend.app.services.data_service import data_service, DataService
from backend.app.services.simulation_service import simulation_service, SimulationService
from backend.app.services.supabase_service import supabase_service, SupabaseService


def get_data_service() -> DataService:
    """Dependency provider for DataService."""
    return data_service


def get_simulation_service() -> SimulationService:
    """Dependency provider for SimulationService."""
    return simulation_service


def get_supabase_service() -> SupabaseService:
    """Dependency provider for SupabaseService."""
    return supabase_service
