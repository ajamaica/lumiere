"""
Utility functions for locating paths.

Config and store discovery follows this priority:

Config discovery:
1. KEEP_CONFIG envvar (path to .keep/ directory)
2. Tree-walk from cwd up to ~, find first .keep/keep.toml
3. ~/.keep/ default

Store resolution:
1. --store CLI option (passed to Keeper)
2. KEEP_STORE_PATH envvar
3. store.path in config file
4. Config directory itself (backwards compat)
"""

from __future__ import annotations

import os
import warnings
from pathlib import Path
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .config import StoreConfig


def find_git_root(start_path: Optional[Path] = None) -> Optional[Path]:
    """
    Find the root of the git repository containing the given path.
    
    Args:
        start_path: Path to start searching from. Defaults to cwd.
    
    Returns:
        Path to git root, or None if not in a git repository.
    """
    if start_path is None:
        start_path = Path.cwd()
    
    current = start_path.resolve()
    
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    
    # Check root as well
    if (current / ".git").exists():
        return current
    
    return None


def find_config_dir(start_path: Optional[Path] = None) -> Path:
    """
    Find config directory by tree-walking from start_path up to home.

    Looks for .keep/keep.toml at each directory level, stopping at home.
    Returns the .keep/ directory containing the config, or ~/.keep/ if none found.

    Args:
        start_path: Path to start searching from. Defaults to cwd.

    Returns:
        Path to the .keep/ config directory.
    """
    if start_path is None:
        start_path = Path.cwd()

    home = Path.home()
    current = start_path.resolve()

    while True:
        candidate = current / ".keep" / "keep.toml"
        if candidate.exists():
            return current / ".keep"

        # Stop at home or filesystem root
        if current == home or current == current.parent:
            break
        current = current.parent

    # Default: ~/.keep/
    return home / ".keep"


def get_config_dir() -> Path:
    """
    Get the config directory.

    Priority:
    1. KEEP_CONFIG environment variable
    2. Tree-walk from cwd up to ~ (find_config_dir)

    Returns:
        Path to the .keep/ config directory.
    """
    env = os.environ.get("KEEP_CONFIG")
    if env:
        return Path(env).expanduser().resolve()
    return find_config_dir()


def get_default_store_path(config: Optional[StoreConfig] = None) -> Path:
    """
    Get the default store path.

    Priority:
    1. KEEP_STORE_PATH environment variable
    2. store.path setting in config file
    3. Config directory itself (backwards compat)

    Args:
        config: Optional loaded config to check for store.path setting.

    Returns:
        Path to the store directory (may not exist yet).
    """
    # Check environment variable first
    env_path = os.environ.get("KEEP_STORE_PATH")
    if env_path:
        return Path(env_path).resolve()

    # Check config for explicit store.path
    if config and config.store_path:
        return Path(config.store_path).expanduser().resolve()

    # Default: config directory is also the store
    return get_config_dir()
