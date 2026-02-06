"""
Configuration management for the Synapse Protocol.

Handles loading and saving configuration from various sources:
- Environment variables
- ~/.openclaw/openclaw.json
- Local config files
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class SynapseConfig:
    """Configuration for the Synapse Protocol node."""
    
    # Node settings
    node_id: Optional[str] = None
    listen_port: int = 6881
    data_dir: str = "./synapse_data"
    
    # Network settings
    max_connections: int = 50
    download_rate_limit: int = 0  # 0 = unlimited (KB/s)
    upload_rate_limit: int = 0    # 0 = unlimited (KB/s)
    
    # Default trackers (includes local Synapse Tracker with search)
    default_trackers: list = field(default_factory=lambda: [
        "http://localhost:6881/announce",  # Local Synapse Tracker
        "udp://tracker.opentrackr.org:1337/announce",
        "udp://open.tracker.cl:1337/announce",
    ])
    
    # Synapse Tracker search endpoint
    search_endpoint: str = "http://localhost:6881/api/search"
    
    # Agent settings (Nomic Embed Text V2)
    agent_model: str = "nomic-ai/nomic-embed-text-v1.5"
    agent_dimension: int = 768
    use_onnx: bool = True
    
    # Safety settings
    strict_mode: bool = True
    auto_assimilate: bool = False  # Automatically merge verified shards
    safety_threshold: float = 0.8
    
    # Maintenance settings
    health_check_interval: int = 1800  # 30 minutes in seconds
    dht_refresh_interval: int = 21600  # 6 hours in seconds
    prune_completed_after: int = 604800  # 7 days in seconds
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON."""
        return json.dumps(self.to_dict(), indent=indent)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SynapseConfig':
        """Create from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})
    
    @classmethod
    def from_json(cls, json_str: str) -> 'SynapseConfig':
        """Deserialize from JSON."""
        return cls.from_dict(json.loads(json_str))


def load_config(config_path: Optional[str] = None) -> SynapseConfig:
    """
    Load configuration from file or environment.
    
    Priority order:
    1. Specified config_path
    2. ./synapse_config.json
    3. ~/.openclaw/synapse_config.json
    4. Environment variables
    5. Defaults
    
    Args:
        config_path: Optional path to config file
        
    Returns:
        Loaded SynapseConfig instance
    """
    config = SynapseConfig()
    
    # Try to load from file
    search_paths = []
    
    if config_path:
        search_paths.append(Path(config_path))
    
    search_paths.extend([
        Path("./synapse_config.json"),
        Path.home() / ".openclaw" / "synapse_config.json",
    ])
    
    for path in search_paths:
        if path.exists():
            with open(path) as f:
                data = json.load(f)
                config = SynapseConfig.from_dict(data)
            break
    
    # Override with environment variables
    env_overrides = {
        "SYNAPSE_NODE_ID": "node_id",
        "SYNAPSE_PORT": "listen_port",
        "SYNAPSE_DATA_DIR": "data_dir",
        "SYNAPSE_AGENT_MODEL": "agent_model",
        "SYNAPSE_AGENT_DIMS": "agent_dimension",
        "SYNAPSE_STRICT_MODE": "strict_mode",
    }
    
    for env_var, config_key in env_overrides.items():
        value = os.getenv(env_var)
        if value is not None:
            # Type conversion
            if config_key in ["listen_port", "agent_dimension"]:
                value = int(value)
            elif config_key == "strict_mode":
                value = value.lower() in ["true", "1", "yes"]
            
            setattr(config, config_key, value)
    
    return config


def save_config(config: SynapseConfig, config_path: Optional[str] = None) -> str:
    """
    Save configuration to file.
    
    Args:
        config: SynapseConfig instance to save
        config_path: Optional path to save to. Defaults to ~/.openclaw/synapse_config.json
        
    Returns:
        Path where config was saved
    """
    if config_path is None:
        config_path = Path.home() / ".openclaw" / "synapse_config.json"
    else:
        config_path = Path(config_path)
    
    # Ensure directory exists
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save
    with open(config_path, "w") as f:
        f.write(config.to_json())
    
    return str(config_path)


def get_openclaw_config() -> Dict[str, Any]:
    """
    Load the main OpenClaw configuration file.
    
    Returns:
        Dictionary with OpenClaw configuration or empty dict if not found
    """
    openclaw_config_path = Path.home() / ".openclaw" / "openclaw.json"
    
    if not openclaw_config_path.exists():
        return {}
    
    with open(openclaw_config_path) as f:
        return json.load(f)


def get_skill_env_vars() -> Dict[str, str]:
    """
    Get environment variables configured for this skill in OpenClaw.
    
    Returns:
        Dictionary of environment variables
    """
    openclaw_config = get_openclaw_config()
    
    # Navigate to skill env vars if they exist
    skills_config = openclaw_config.get("skills", {})
    synapse_config = skills_config.get("synapse-protocol", {})
    env_vars = synapse_config.get("env", {})
    
    return env_vars
