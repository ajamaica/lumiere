"""Configuration management for Garmer."""

import json
import logging
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class GarmerConfig(BaseModel):
    """Configuration settings for Garmer."""

    # Authentication
    token_dir: Path = Field(default_factory=lambda: Path.home() / ".garmer")
    token_file: str = "garmin_tokens"

    # Logging
    log_level: str = "INFO"
    log_file: Path | None = None

    # Data export
    export_dir: Path = Field(default_factory=lambda: Path.home() / ".garmer" / "exports")
    export_format: str = "json"  # json or csv

    # Cache settings
    cache_enabled: bool = True
    cache_ttl_seconds: int = 300  # 5 minutes

    # Request settings
    request_timeout: int = 30
    max_retries: int = 3

    model_config = {"extra": "ignore"}

    @classmethod
    def from_file(cls, config_path: Path | str) -> "GarmerConfig":
        """
        Load configuration from a JSON file.

        Args:
            config_path: Path to the configuration file

        Returns:
            GarmerConfig instance
        """
        config_path = Path(config_path)
        if not config_path.exists():
            logger.warning(f"Config file not found at {config_path}, using defaults")
            return cls()

        try:
            with open(config_path) as f:
                data = json.load(f)
            return cls.model_validate(data)
        except Exception as e:
            logger.warning(f"Failed to load config from {config_path}: {e}")
            return cls()

    @classmethod
    def from_env(cls) -> "GarmerConfig":
        """
        Load configuration from environment variables.

        Environment variables should be prefixed with GARMER_.
        Example: GARMER_TOKEN_DIR, GARMER_LOG_LEVEL

        Returns:
            GarmerConfig instance
        """
        config_data: dict[str, Any] = {}

        env_mappings = {
            "GARMER_TOKEN_DIR": "token_dir",
            "GARMER_TOKEN_FILE": "token_file",
            "GARMER_LOG_LEVEL": "log_level",
            "GARMER_LOG_FILE": "log_file",
            "GARMER_EXPORT_DIR": "export_dir",
            "GARMER_EXPORT_FORMAT": "export_format",
            "GARMER_CACHE_ENABLED": "cache_enabled",
            "GARMER_CACHE_TTL": "cache_ttl_seconds",
            "GARMER_REQUEST_TIMEOUT": "request_timeout",
            "GARMER_MAX_RETRIES": "max_retries",
        }

        for env_var, config_key in env_mappings.items():
            value = os.environ.get(env_var)
            if value is not None:
                # Handle type conversions
                if config_key in ("cache_enabled",):
                    config_data[config_key] = value.lower() in ("true", "1", "yes")
                elif config_key in ("cache_ttl_seconds", "request_timeout", "max_retries"):
                    config_data[config_key] = int(value)
                elif config_key in ("token_dir", "log_file", "export_dir"):
                    config_data[config_key] = Path(value)
                else:
                    config_data[config_key] = value

        return cls.model_validate(config_data)

    def save(self, config_path: Path | str) -> None:
        """
        Save configuration to a JSON file.

        Args:
            config_path: Path to save the configuration file
        """
        config_path = Path(config_path)
        config_path.parent.mkdir(parents=True, exist_ok=True)

        data = self.model_dump(mode="json")
        # Convert Path objects to strings
        for key, value in data.items():
            if isinstance(value, Path):
                data[key] = str(value)

        with open(config_path, "w") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Saved configuration to {config_path}")

    def setup_logging(self) -> None:
        """Configure logging based on settings."""
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

        handlers: list[logging.Handler] = [logging.StreamHandler()]

        if self.log_file:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
            handlers.append(logging.FileHandler(self.log_file))

        logging.basicConfig(
            level=getattr(logging, self.log_level.upper()),
            format=log_format,
            handlers=handlers,
        )


def load_config() -> GarmerConfig:
    """
    Load configuration from standard locations.

    Checks in order:
    1. Environment variables
    2. ~/.garmer/config.json
    3. Default values

    Returns:
        GarmerConfig instance
    """
    # Start with defaults
    config = GarmerConfig()

    # Try to load from file
    default_config_path = Path.home() / ".garmer" / "config.json"
    if default_config_path.exists():
        config = GarmerConfig.from_file(default_config_path)

    # Override with environment variables
    env_config = GarmerConfig.from_env()
    config_dict = config.model_dump()
    env_dict = env_config.model_dump()

    # Merge env values that were explicitly set
    for key in env_dict:
        env_value = os.environ.get(f"GARMER_{key.upper()}")
        if env_value is not None:
            config_dict[key] = env_dict[key]

    return GarmerConfig.model_validate(config_dict)
