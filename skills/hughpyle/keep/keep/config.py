"""
Configuration management for reflective memory stores.

The configuration is stored as a TOML file in the store directory.
It specifies which providers to use and their parameters.
"""

import os
import platform
import tomllib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# tomli_w for writing TOML (tomllib is read-only)
import tomli_w


CONFIG_FILENAME = "keep.toml"
CONFIG_VERSION = 3  # Bumped for document versioning support
SYSTEM_DOCS_VERSION = 1  # Increment when bundled system docs content changes


@dataclass
class ProviderConfig:
    """Configuration for a single provider."""
    name: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class EmbeddingIdentity:
    """
    Identity of an embedding model for compatibility checking.
    
    Two embeddings are compatible only if they have the same identity.
    Different models, even with the same dimension, produce incompatible vectors.
    """
    provider: str  # e.g., "sentence-transformers", "openai"
    model: str     # e.g., "all-MiniLM-L6-v2", "text-embedding-3-small"
    dimension: int # e.g., 384, 1536
    
    @property
    def key(self) -> str:
        """
        Short key for collection naming.
        
        Format: {provider}_{model_slug}
        e.g., "st_MiniLM_L6_v2", "openai_3_small"
        """
        # Simplify model name for use in collection names
        model_slug = self.model.replace("-", "_").replace(".", "_")
        # Remove common prefixes
        for prefix in ["all_", "text_embedding_"]:
            if model_slug.lower().startswith(prefix):
                model_slug = model_slug[len(prefix):]
        # Shorten provider names
        provider_short = {
            "sentence-transformers": "st",
            "openai": "openai",
            "gemini": "gemini",
            "ollama": "ollama",
        }.get(self.provider, self.provider[:6])
        
        return f"{provider_short}_{model_slug}"


@dataclass
class StoreConfig:
    """Complete store configuration."""
    path: Path  # Store path (where data lives)
    config_dir: Optional[Path] = None  # Where config was loaded from (may differ from path)
    store_path: Optional[str] = None  # Explicit store.path from config file (raw string)
    version: int = CONFIG_VERSION
    created: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Provider configurations
    embedding: ProviderConfig = field(default_factory=lambda: ProviderConfig("sentence-transformers"))
    summarization: ProviderConfig = field(default_factory=lambda: ProviderConfig("truncate"))
    document: ProviderConfig = field(default_factory=lambda: ProviderConfig("composite"))

    # Embedding identity (set after first use, used for validation)
    embedding_identity: Optional[EmbeddingIdentity] = None

    # Default tags applied to all update/remember operations
    default_tags: dict[str, str] = field(default_factory=dict)

    # Maximum length for summaries (used for smart remember and validation)
    max_summary_length: int = 500

    # System docs version (tracks which bundled docs have been applied to this store)
    system_docs_version: int = 0

    @property
    def config_path(self) -> Path:
        """Path to the TOML config file."""
        config_location = self.config_dir if self.config_dir else self.path
        return config_location / CONFIG_FILENAME

    def exists(self) -> bool:
        """Check if config file exists."""
        return self.config_path.exists()


def read_openclaw_config() -> dict | None:
    """
    Read OpenClaw configuration if available.

    Checks:
    1. OPENCLAW_CONFIG environment variable
    2. ~/.openclaw/openclaw.json (default location)

    Returns None if not found or invalid.
    """
    import json

    # Try environment variable first
    config_path_str = os.environ.get("OPENCLAW_CONFIG")
    if config_path_str:
        config_file = Path(config_path_str)
    else:
        # Default location
        config_file = Path.home() / ".openclaw" / "openclaw.json"

    if not config_file.exists():
        return None

    try:
        with open(config_file) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def get_openclaw_memory_search_config(openclaw_config: dict | None) -> dict | None:
    """
    Extract memorySearch config from OpenClaw config.

    Returns the memorySearch settings or None if not configured.

    Example structure:
        {
            "provider": "openai" | "gemini" | "local" | "auto",
            "model": "text-embedding-3-small",
            "remote": {
                "apiKey": "sk-...",
                "baseUrl": "https://..."
            }
        }
    """
    if not openclaw_config:
        return None

    return (openclaw_config
            .get("agents", {})
            .get("defaults", {})
            .get("memorySearch", None))


def detect_default_providers() -> dict[str, ProviderConfig]:
    """
    Detect the best default providers for the current environment.

    Priority for embeddings:
    1. OpenClaw memorySearch config (if configured with provider + API key)
    2. sentence-transformers (local fallback)

    Priority for summarization:
    1. OpenClaw model config + Anthropic (if configured and ANTHROPIC_API_KEY available)
    2. MLX (Apple Silicon local-first)
    3. OpenAI (if API key available)
    4. Fallback: truncate

    Returns provider configs for: embedding, summarization, document
    """
    providers = {}

    # Check for Apple Silicon
    is_apple_silicon = (
        platform.system() == "Darwin" and
        platform.machine() == "arm64"
    )

    # Check for API keys
    has_anthropic_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_openai_key = bool(
        os.environ.get("KEEP_OPENAI_API_KEY") or
        os.environ.get("OPENAI_API_KEY")
    )
    has_gemini_key = bool(
        os.environ.get("GEMINI_API_KEY") or
        os.environ.get("GOOGLE_API_KEY")
    )

    # Check for OpenClaw config
    openclaw_config = read_openclaw_config()
    openclaw_model = None
    if openclaw_config:
        model_str = (openclaw_config.get("agents", {})
                     .get("defaults", {})
                     .get("model", {})
                     .get("primary", ""))
        if model_str:
            openclaw_model = model_str

    # Get OpenClaw memorySearch config for embeddings
    memory_search = get_openclaw_memory_search_config(openclaw_config)

    # Embedding: check OpenClaw memorySearch config first, then fall back to local
    embedding_provider = None
    if memory_search:
        ms_provider = memory_search.get("provider", "auto")
        ms_model = memory_search.get("model")
        ms_api_key = memory_search.get("remote", {}).get("apiKey")

        if ms_provider == "openai" or (ms_provider == "auto" and has_openai_key):
            # Use OpenAI embeddings if configured or auto with key available
            api_key = ms_api_key or os.environ.get("OPENAI_API_KEY")
            if api_key:
                params = {}
                if ms_model:
                    params["model"] = ms_model
                embedding_provider = ProviderConfig("openai", params)

        elif ms_provider == "gemini" or (ms_provider == "auto" and has_gemini_key and not has_openai_key):
            # Use Gemini embeddings if configured or auto with key available
            api_key = ms_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if api_key:
                params = {}
                if ms_model:
                    params["model"] = ms_model
                embedding_provider = ProviderConfig("gemini", params)

    # Fall back to local embedding (prefer MPS-accelerated on Apple Silicon)
    if embedding_provider is None:
        if is_apple_silicon:
            # Use sentence-transformers with MPS acceleration (no auth required)
            embedding_provider = ProviderConfig("mlx", {"model": "all-MiniLM-L6-v2"})
        else:
            embedding_provider = ProviderConfig("sentence-transformers")

    providers["embedding"] = embedding_provider
    
    # Summarization: priority order based on availability
    # 1. OpenClaw + Anthropic (if configured and key available)
    if openclaw_model and openclaw_model.startswith("anthropic/") and has_anthropic_key:
        # Extract model name from "anthropic/claude-sonnet-4-5" format
        model_name = openclaw_model.split("/", 1)[1] if "/" in openclaw_model else "claude-3-5-haiku-20241022"
        # Map OpenClaw model names to actual Anthropic model names
        model_mapping = {
            "claude-sonnet-4": "claude-sonnet-4-20250514",
            "claude-sonnet-4-5": "claude-sonnet-4-20250514",
            "claude-sonnet-3-5": "claude-3-5-sonnet-20241022",
            "claude-haiku-3-5": "claude-3-5-haiku-20241022",
        }
        actual_model = model_mapping.get(model_name, "claude-3-5-haiku-20241022")
        providers["summarization"] = ProviderConfig("anthropic", {"model": actual_model})
    # 2. MLX on Apple Silicon (local-first)
    elif is_apple_silicon:
        try:
            import mlx_lm  # noqa
            providers["summarization"] = ProviderConfig("mlx", {"model": "mlx-community/Llama-3.2-3B-Instruct-4bit"})
        except ImportError:
            if has_openai_key:
                providers["summarization"] = ProviderConfig("openai")
            else:
                providers["summarization"] = ProviderConfig("passthrough")
    # 3. OpenAI (if key available)
    elif has_openai_key:
        providers["summarization"] = ProviderConfig("openai")
    # 4. Fallback: truncate
    else:
        providers["summarization"] = ProviderConfig("truncate")
    
    # Document provider is always composite
    providers["document"] = ProviderConfig("composite")
    
    return providers


def create_default_config(config_dir: Path, store_path: Optional[Path] = None) -> StoreConfig:
    """
    Create a new config with auto-detected defaults.

    Args:
        config_dir: Directory where keep.toml will be saved
        store_path: Optional explicit store location (if different from config_dir)
    """
    providers = detect_default_providers()

    # If store_path is provided and different from config_dir, record it
    store_path_str = None
    actual_store = config_dir
    if store_path and store_path.resolve() != config_dir.resolve():
        store_path_str = str(store_path)
        actual_store = store_path

    return StoreConfig(
        path=actual_store,
        config_dir=config_dir,
        store_path=store_path_str,
        embedding=providers["embedding"],
        summarization=providers["summarization"],
        document=providers["document"],
    )


def load_config(config_dir: Path) -> StoreConfig:
    """
    Load configuration from a config directory.

    The config_dir is where keep.toml lives. The actual store location
    may be different if store.path is set in the config.

    Args:
        config_dir: Directory containing keep.toml

    Raises:
        FileNotFoundError: If config doesn't exist
        ValueError: If config is invalid
    """
    config_path = config_dir / CONFIG_FILENAME

    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    with open(config_path, "rb") as f:
        data = tomllib.load(f)

    # Validate version
    version = data.get("store", {}).get("version", 1)
    if version > CONFIG_VERSION:
        raise ValueError(f"Config version {version} is newer than supported ({CONFIG_VERSION})")

    # Parse store.path - explicit store location
    store_path_str = data.get("store", {}).get("path")
    if store_path_str:
        actual_store = Path(store_path_str).expanduser().resolve()
    else:
        actual_store = config_dir  # Backwards compat: store is at config location

    # Parse provider configs
    def parse_provider(section: dict) -> ProviderConfig:
        return ProviderConfig(
            name=section.get("name", ""),
            params={k: v for k, v in section.items() if k != "name"},
        )

    # Parse default tags (filter out system tags)
    raw_tags = data.get("tags", {})
    default_tags = {k: str(v) for k, v in raw_tags.items()
                    if not k.startswith("_")}

    # Parse max_summary_length (default 500)
    max_summary_length = data.get("store", {}).get("max_summary_length", 500)

    # Parse system_docs_version (default 0 for stores that predate this feature)
    system_docs_version = data.get("store", {}).get("system_docs_version", 0)

    return StoreConfig(
        path=actual_store,
        config_dir=config_dir,
        store_path=store_path_str,
        version=version,
        created=data.get("store", {}).get("created", ""),
        embedding=parse_provider(data.get("embedding", {"name": "sentence-transformers"})),
        summarization=parse_provider(data.get("summarization", {"name": "truncate"})),
        document=parse_provider(data.get("document", {"name": "composite"})),
        embedding_identity=parse_embedding_identity(data.get("embedding_identity")),
        default_tags=default_tags,
        max_summary_length=max_summary_length,
        system_docs_version=system_docs_version,
    )


def parse_embedding_identity(data: dict | None) -> EmbeddingIdentity | None:
    """Parse embedding identity from config data."""
    if data is None:
        return None
    provider = data.get("provider")
    model = data.get("model")
    dimension = data.get("dimension")
    if provider and model and dimension:
        return EmbeddingIdentity(provider=provider, model=model, dimension=dimension)
    return None


def save_config(config: StoreConfig) -> None:
    """
    Save configuration to the config directory.

    Creates the directory if it doesn't exist.
    """
    # Ensure config directory exists
    config_location = config.config_dir if config.config_dir else config.path
    config_location.mkdir(parents=True, exist_ok=True)

    # Build TOML structure
    def provider_to_dict(p: ProviderConfig) -> dict:
        d = {"name": p.name}
        d.update(p.params)
        return d

    store_section: dict[str, Any] = {
        "version": config.version,
        "created": config.created,
    }
    # Only write store.path if explicitly set (not default)
    if config.store_path:
        store_section["path"] = config.store_path
    # Only write max_summary_length if not default
    if config.max_summary_length != 500:
        store_section["max_summary_length"] = config.max_summary_length
    # Write system_docs_version if set (tracks migration state)
    if config.system_docs_version > 0:
        store_section["system_docs_version"] = config.system_docs_version

    data = {
        "store": store_section,
        "embedding": provider_to_dict(config.embedding),
        "summarization": provider_to_dict(config.summarization),
        "document": provider_to_dict(config.document),
    }

    # Add embedding identity if set
    if config.embedding_identity:
        data["embedding_identity"] = {
            "provider": config.embedding_identity.provider,
            "model": config.embedding_identity.model,
            "dimension": config.embedding_identity.dimension,
        }

    # Add default tags if set
    if config.default_tags:
        data["tags"] = config.default_tags

    with open(config.config_path, "wb") as f:
        tomli_w.dump(data, f)


def load_or_create_config(config_dir: Path, store_path: Optional[Path] = None) -> StoreConfig:
    """
    Load existing config or create a new one with defaults.

    This is the main entry point for config management.

    Args:
        config_dir: Directory containing (or to contain) keep.toml
        store_path: Optional explicit store location (for new configs only)
    """
    config_path = config_dir / CONFIG_FILENAME

    if config_path.exists():
        return load_config(config_dir)
    else:
        config = create_default_config(config_dir, store_path)
        save_config(config)
        return config
