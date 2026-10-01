from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env.

    Keeping all configuration here (rather than scattered os.getenv() calls)
    is what lets the hybrid-match weights and thresholds stay configurable
    instead of hardcoded, per the project spec.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Hybrid matching weights (Phase 5)
    match_weight_image: float = 0.45
    match_weight_text: float = 0.35
    match_weight_location: float = 0.10
    match_weight_date: float = 0.10

    # Match category thresholds (Phase 5)
    match_threshold_strong: int = 80
    match_threshold_possible: int = 60

    # Storage
    item_images_bucket: str = "item-images"
    max_image_size_mb: int = 5
    allowed_image_types: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
