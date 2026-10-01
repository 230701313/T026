from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    """Client scoped to the anon key - safe for operations that should
    respect row-level security as an anonymous/authenticated caller."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache
def get_supabase_admin_client() -> Client:
    """Client scoped to the service role key - bypasses row-level security.

    Only use this for trusted server-side operations (e.g. writing a match
    row computed by the backend itself). Never expose this key to the
    frontend.
    """
    key = settings.supabase_service_role_key or settings.supabase_anon_key
    return create_client(settings.supabase_url, key)
