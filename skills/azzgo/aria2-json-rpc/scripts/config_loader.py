#!/usr/bin/env python3
"""
Configuration loader for aria2-json-rpc skill.

Supports three-tier configuration priority:
1. Environment variables (highest priority)
2. config.json file in skill directory
3. Interactive defaults (fallback)

Configuration schema:
{
    "host": "localhost",
    "port": 6800,
    "secret": null,
    "secure": false,
    "timeout": 30000
}
"""

import json
import os
import sys
import urllib.request
import urllib.error


class ConfigurationError(Exception):
    """Raised when configuration is invalid or cannot be loaded."""

    pass


class Aria2Config:
    """
    Manages aria2 RPC configuration with multi-source loading.

    Configuration priority (highest to lowest):
    1. Environment variables (ARIA2_RPC_*)
    2. Skill directory config (project-specific)
    3. User config directory (global fallback, update-safe)
    4. Defaults
    """

    DEFAULT_CONFIG = {
        "host": "localhost",
        "port": 6800,
        "path": None,  # Optional: specify path like "/jsonrpc". If null, no path is appended.
        "secret": None,
        "secure": False,
        "timeout": 30000,
    }

    # Environment variable names
    ENV_PREFIX = "ARIA2_RPC_"
    ENV_VARS = {
        "host": "ARIA2_RPC_HOST",
        "port": "ARIA2_RPC_PORT",
        "path": "ARIA2_RPC_PATH",
        "secret": "ARIA2_RPC_SECRET",
        "secure": "ARIA2_RPC_SECURE",
        "timeout": "ARIA2_RPC_TIMEOUT",
    }

    # User config directory (XDG standard)
    USER_CONFIG_DIR = os.path.expanduser("~/.config/aria2-skill")
    USER_CONFIG_FILE = os.path.join(USER_CONFIG_DIR, "config.json")

    def __init__(self, config_path=None):
        """
        Initialize configuration loader.

        Args:
            config_path (str, optional): Explicit path to config.json file.
                                        If provided, only this path will be used.
                                        Otherwise, searches multiple locations.
        """
        self.explicit_config_path = config_path
        self.config = self.DEFAULT_CONFIG.copy()
        self._loaded = False
        self._loaded_from = None  # Track where config was loaded from
        self._loaded_from_env = False  # Track if env vars were used

    def _get_skill_config_path(self):
        """Get the config.json path in the skill directory."""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        skill_dir = os.path.dirname(script_dir)
        return os.path.join(skill_dir, "config.json")

    def _get_config_search_paths(self):
        """
        Get list of config file paths to search (in priority order).

        Priority (high to low):
        1. Environment variables (handled separately in load())
        2. Skill directory config (project-specific, may be lost on update)
        3. User config directory (global fallback, update-safe)
        4. Defaults (handled separately in load())

        Returns:
            list: List of (path, description) tuples
        """
        if self.explicit_config_path:
            return [(self.explicit_config_path, "explicit path")]

        paths = [
            (self._get_skill_config_path(), "skill directory"),
            (self.USER_CONFIG_FILE, "user config directory"),
        ]

        return paths

    def load(self):
        """
        Load configuration from all sources with priority resolution.

        Priority: Environment Variables > Skill Directory > User Directory > Defaults

        Returns:
            dict: Loaded configuration

        Raises:
            ConfigurationError: If configuration is invalid
        """
        # 1. Start with defaults
        config = self.DEFAULT_CONFIG.copy()
        self._loaded_from = "defaults"

        # 2. Search config files (skill dir → user dir)
        for config_path, description in self._get_config_search_paths():
            if os.path.exists(config_path):
                try:
                    file_config = self._load_from_file(config_path)
                    config.update(file_config)
                    self._loaded_from = config_path
                    break  # Use first found config
                except Exception as e:
                    # If explicit path was specified, raise the error
                    if self.explicit_config_path:
                        raise
                    # Otherwise, log warning and continue to next path
                    print(f"Warning: Failed to load config from {config_path}: {e}")
                    continue

        # 3. Override with environment variables (highest priority)
        env_config = self._load_from_env()
        if env_config:
            config.update(env_config)
            self._loaded_from_env = True

        # 4. Validate configuration
        self._validate_config(config)

        self.config = config
        self._loaded = True
        return config

    def _load_from_file(self, path):
        """
        Load configuration from JSON file.

        Args:
            path (str): Path to config.json

        Returns:
            dict: Configuration from file

        Raises:
            ConfigurationError: If file is invalid JSON or unreadable
        """
        try:
            with open(path, "r") as f:
                file_config = json.load(f)
        except json.JSONDecodeError as e:
            raise ConfigurationError(
                f"Invalid JSON in config file: {path}\n"
                f"Error at line {e.lineno}, column {e.colno}: {e.msg}\n"
                f"Example valid structure:\n"
                f"{json.dumps(self.DEFAULT_CONFIG, indent=2)}"
            )
        except PermissionError:
            raise ConfigurationError(
                f"Permission denied reading config file: {path}\n"
                f"Please check file permissions: chmod 644 {path}"
            )
        except Exception as e:
            raise ConfigurationError(f"Error reading config file: {e}")

        return file_config

    def _load_from_env(self):
        """
        Load configuration from environment variables.

        Returns:
            dict: Configuration from environment variables
        """
        env_config = {}

        for key, env_var in self.ENV_VARS.items():
            value = os.environ.get(env_var)
            if value is not None:
                # Type conversion based on expected type
                if key == "port" or key == "timeout":
                    try:
                        env_config[key] = int(value)
                    except ValueError:
                        print(
                            f"WARNING: Invalid {env_var}={value}, expected integer. Ignoring."
                        )
                elif key == "secure":
                    env_config[key] = value.lower() in ("true", "1", "yes")
                elif key == "secret":
                    # Empty string means no secret
                    env_config[key] = value if value else None
                elif key == "path":
                    # Empty string means no path (will be None)
                    # Ensure non-empty path starts with /
                    if value:
                        if not value.startswith("/"):
                            value = "/" + value
                        env_config[key] = value
                    else:
                        env_config[key] = None
                else:
                    env_config[key] = value

        return env_config

    def _validate_config(self, config):
        """
        Validate configuration values.

        Args:
            config (dict): Configuration to validate

        Raises:
            ConfigurationError: If configuration is invalid
        """
        # Validate required fields
        if not config.get("host"):
            raise ConfigurationError(
                "Missing required field: 'host'\n"
                f"Example configuration:\n{json.dumps(self.DEFAULT_CONFIG, indent=2)}"
            )

        if (
            not isinstance(config.get("port"), int)
            or config["port"] <= 0
            or config["port"] > 65535
        ):
            raise ConfigurationError(
                f"Invalid port: {config.get('port')}. Must be integer between 1-65535."
            )

        if not isinstance(config.get("timeout"), int) or config["timeout"] <= 0:
            raise ConfigurationError(
                f"Invalid timeout: {config.get('timeout')}. Must be positive integer (milliseconds)."
            )

        # Validate optional fields
        if config.get("secret") is not None and not isinstance(config["secret"], str):
            raise ConfigurationError("Secret must be a string or null")

        if not isinstance(config.get("secure"), bool):
            raise ConfigurationError("Secure must be a boolean (true/false)")

        # Validate path (optional field)
        path = config.get("path")
        if path is not None:
            if not isinstance(path, str):
                raise ConfigurationError("Path must be a string or null")

            if not path.startswith("/"):
                raise ConfigurationError(
                    f"Invalid path: {path}. Must start with '/' (e.g., '/jsonrpc') or be null"
                )

    def test_connection(self):
        """
        Test connection to aria2 RPC endpoint.

        Returns:
            bool: True if connection successful, False otherwise
        """
        if not self._loaded:
            self.load()

        # Build URL
        protocol = "https" if self.config["secure"] else "http"
        path = self.config.get("path") or ""
        url = f"{protocol}://{self.config['host']}:{self.config['port']}{path}"

        # Create a simple test request (aria2.getVersion)
        request_data = {
            "jsonrpc": "2.0",
            "id": "test-connection",
            "method": "aria2.getVersion",
            "params": [],
        }

        # Add token if configured
        if self.config.get("secret"):
            request_data["params"].insert(0, f"token:{self.config['secret']}")

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(request_data).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )

            timeout_sec = self.config["timeout"] / 1000.0
            response = urllib.request.urlopen(req, timeout=timeout_sec)
            result = json.loads(response.read().decode("utf-8"))

            # Check for valid JSON-RPC response
            if "result" in result or "error" in result:
                return True
            else:
                return False

        except urllib.error.URLError as e:
            print(f"Connection test failed: {e}")
            return False
        except Exception as e:
            print(f"Connection test error: {e}")
            return False

    def get(self, key, default=None):
        """Get configuration value."""
        if not self._loaded:
            self.load()
        return self.config.get(key, default)

    def get_all(self):
        """Get all configuration values."""
        if not self._loaded:
            self.load()
        return self.config.copy()

    def get_loaded_from(self):
        """
        Get information about where configuration was loaded from.

        Returns:
            dict: Dictionary with keys:
                - 'path': Config file path or 'defaults'
                - 'has_env_override': Whether environment variables were used
        """
        if not self._loaded:
            self.load()
        return {
            "path": self._loaded_from,
            "has_env_override": self._loaded_from_env,
        }

    def reload(self):
        """
        Reload configuration from all sources.

        Returns:
            dict: Reloaded configuration

        Note: If reload fails, previous configuration is preserved.
        """
        old_config = self.config.copy()
        old_loaded_from = self._loaded_from
        old_loaded_from_env = self._loaded_from_env

        try:
            self.config = self.DEFAULT_CONFIG.copy()
            self._loaded = False
            self._loaded_from = None
            self._loaded_from_env = False
            return self.load()
        except Exception as e:
            # Restore previous configuration on error
            self.config = old_config
            self._loaded = True
            self._loaded_from = old_loaded_from
            self._loaded_from_env = old_loaded_from_env
            raise ConfigurationError(
                f"Configuration reload failed: {e}\nPrevious configuration preserved."
            )

    def get_endpoint_url(self):
        """Get the full RPC endpoint URL."""
        if not self._loaded:
            self.load()

        protocol = "https" if self.config["secure"] else "http"
        path = self.config.get("path") or ""
        return f"{protocol}://{self.config['host']}:{self.config['port']}{path}"


if __name__ == "__main__":
    import argparse
    import shutil

    parser = argparse.ArgumentParser(
        description="aria2 RPC Configuration Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show current configuration and source
  python3 config_loader.py show

  # Initialize user config (update-safe)
  python3 config_loader.py init --user

  # Initialize local config (project-specific)
  python3 config_loader.py init --local

  # Test connection
  python3 config_loader.py test
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Show command
    show_parser = subparsers.add_parser(
        "show", help="Show current configuration and source"
    )

    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize configuration file")
    init_group = init_parser.add_mutually_exclusive_group(required=True)
    init_group.add_argument(
        "--user",
        action="store_true",
        help="Initialize user config (~/.config/aria2-skill/)",
    )
    init_group.add_argument(
        "--local", action="store_true", help="Initialize skill directory config"
    )

    # Test command
    test_parser = subparsers.add_parser("test", help="Test connection to aria2 RPC")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    try:
        if args.command == "show":
            # Show current configuration
            config = Aria2Config()
            config.load()

            loaded_info = config.get_loaded_from()

            print("Configuration Status:")
            print(f"  Loaded from: {loaded_info['path']}")
            if loaded_info["has_env_override"]:
                print("  Environment overrides: Yes")
            print()

            print("Active Configuration:")
            for key, value in config.get_all().items():
                if key == "secret" and value:
                    print(f"  {key}: ****** (hidden)")
                else:
                    print(f"  {key}: {value}")

            print()
            print(f"Endpoint URL: {config.get_endpoint_url()}")

        elif args.command == "init":
            # Initialize configuration file
            script_dir = os.path.dirname(os.path.abspath(__file__))
            skill_dir = os.path.dirname(script_dir)
            example_file = os.path.join(skill_dir, "config.example.json")

            if not os.path.exists(example_file):
                print(f"✗ Error: config.example.json not found at {example_file}")
                sys.exit(1)

            if args.user:
                target_dir = Aria2Config.USER_CONFIG_DIR
                target_file = Aria2Config.USER_CONFIG_FILE
                location_desc = "user config directory (update-safe)"
            else:  # args.local
                target_dir = skill_dir
                target_file = os.path.join(skill_dir, "config.json")
                location_desc = "skill directory (project-specific)"

            # Create directory if needed
            if not os.path.exists(target_dir):
                os.makedirs(target_dir, exist_ok=True)
                print(f"✓ Created directory: {target_dir}")

            # Check if config already exists
            if os.path.exists(target_file):
                response = input(
                    f"Config file already exists at {target_file}\nOverwrite? [y/N]: "
                )
                if response.lower() not in ["y", "yes"]:
                    print("Cancelled.")
                    sys.exit(0)

            # Copy example to target
            shutil.copy2(example_file, target_file)
            print(f"✓ Configuration initialized at: {target_file}")
            print(f"  Location: {location_desc}")
            print()
            print("Next steps:")
            print(f"  1. Edit the file: {target_file}")
            print("  2. Update host, port, secret as needed")
            print("  3. Test connection: python3 config_loader.py test")

        elif args.command == "test":
            # Test connection
            print("Loading configuration...")
            config = Aria2Config()
            config.load()

            loaded_info = config.get_loaded_from()
            print(f"✓ Configuration loaded from: {loaded_info['path']}")
            print()

            print(f"Testing connection to {config.get_endpoint_url()}...")
            if config.test_connection():
                print("✓ Connection successful")
                print()
                print("aria2 RPC is accessible and responding correctly.")
            else:
                print("✗ Connection failed")
                print()
                print("Possible reasons:")
                print("  1. aria2 daemon is not running")
                print("  2. Wrong host/port configuration")
                print("  3. Network/firewall issues")
                print("  4. Wrong RPC secret token")
                print()
                print("Current configuration:")
                for key, value in config.get_all().items():
                    if key == "secret" and value:
                        print(f"  {key}: ****** (hidden)")
                    else:
                        print(f"  {key}: {value}")
                sys.exit(1)

    except ConfigurationError as e:
        print(f"✗ Configuration error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
