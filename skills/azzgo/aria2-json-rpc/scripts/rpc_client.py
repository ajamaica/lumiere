#!/usr/bin/env python3
"""
JSON-RPC 2.0 client for aria2.

Implements the core RPC client with:
- JSON-RPC 2.0 request formatting
- Token authentication injection
- HTTP POST transport using urllib.request
- Response parsing and error handling
"""

import json
import urllib.request
import urllib.error
import sys
import time
import base64
import os
from typing import Any, Dict, List, Optional, Union


class Aria2RpcError(Exception):
    """Raised when aria2 returns an error response."""

    def __init__(
        self, code: int, message: str, data: Any = None, request_id: str = None
    ):
        self.code = code
        self.message = message
        self.data = data
        self.request_id = request_id
        super().__init__(f"aria2 RPC error [{code}]: {message}")


class Aria2RpcClient:
    """
    JSON-RPC 2.0 client for aria2.

    Handles request formatting, authentication, HTTP transport,
    and response parsing according to JSON-RPC 2.0 specification.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the RPC client with configuration.

        Args:
            config: Dictionary with keys: host, port, secret, secure, timeout
        """
        self.config = config
        self.request_counter = 0
        self.endpoint_url = self._build_endpoint_url()

    def _build_endpoint_url(self) -> str:
        """Build the full RPC endpoint URL."""
        protocol = "https" if self.config.get("secure", False) else "http"
        host = self.config["host"]
        port = self.config["port"]
        path = self.config.get("path") or ""
        return f"{protocol}://{host}:{port}{path}"

    def _generate_request_id(self) -> str:
        """Generate a unique request ID."""
        self.request_counter += 1
        return f"aria2-rpc-{self.request_counter}"

    def _inject_token(self, params: List[Any]) -> List[Any]:
        """
        Inject authentication token as first parameter if configured.

        Args:
            params: Original parameters array

        Returns:
            Parameters array with token prepended if secret is configured
        """
        secret = self.config.get("secret")
        if secret:
            return [f"token:{secret}"] + params
        return params

    def _format_request(self, method: str, params: List[Any] = None) -> Dict[str, Any]:
        """
        Format a JSON-RPC 2.0 request.

        Args:
            method: RPC method name (e.g., "aria2.addUri")
            params: Method parameters (list)

        Returns:
            JSON-RPC 2.0 request dictionary
        """
        if params is None:
            params = []

        # Inject token for aria2.* methods (not system.* methods)
        if method.startswith("aria2."):
            params = self._inject_token(params)

        request = {
            "jsonrpc": "2.0",
            "id": self._generate_request_id(),
            "method": method,
            "params": params,
        }

        return request

    def _send_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send HTTP POST request to aria2 RPC endpoint.

        Args:
            request: JSON-RPC request dictionary

        Returns:
            JSON-RPC response dictionary

        Raises:
            urllib.error.URLError: On network errors
            json.JSONDecodeError: On response parse errors
        """
        request_data = json.dumps(request).encode("utf-8")

        req = urllib.request.Request(
            self.endpoint_url,
            data=request_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "aria2-json-rpc-client/1.0",
            },
        )

        timeout_sec = self.config.get("timeout", 30000) / 1000.0

        try:
            response = urllib.request.urlopen(req, timeout=timeout_sec)
            response_data = response.read().decode("utf-8")
            return json.loads(response_data)
        except urllib.error.HTTPError as e:
            # Try to parse error response
            try:
                error_data = e.read().decode("utf-8")
                return json.loads(error_data)
            except:
                raise Exception(f"HTTP error {e.code}: {e.reason}")
        except urllib.error.URLError as e:
            raise Exception(f"Network error: {e.reason}")
        except json.JSONDecodeError as e:
            raise Exception(
                f"Invalid JSON response from aria2\n"
                f"Parse error at line {e.lineno}, column {e.colno}: {e.msg}"
            )

    def _parse_response(self, response: Dict[str, Any], request_id: str) -> Any:
        """
        Parse JSON-RPC 2.0 response and extract result or error.

        Args:
            response: JSON-RPC response dictionary
            request_id: Request ID for correlation

        Returns:
            Result value from response

        Raises:
            Aria2RpcError: If response contains an error
            Exception: If response is invalid
        """
        # Validate JSON-RPC 2.0 response structure
        if not isinstance(response, dict):
            raise Exception("Invalid JSON-RPC response: not a dictionary")

        if response.get("jsonrpc") != "2.0":
            raise Exception(
                "Invalid JSON-RPC response: missing or invalid jsonrpc field"
            )

        if response.get("id") != request_id:
            raise Exception(
                f"Invalid JSON-RPC response: ID mismatch "
                f"(expected {request_id}, got {response.get('id')})"
            )

        # Check for error response
        if "error" in response:
            error = response["error"]
            raise Aria2RpcError(
                code=error.get("code", -1),
                message=error.get("message", "Unknown error"),
                data=error.get("data"),
                request_id=request_id,
            )

        # Extract result
        if "result" not in response:
            raise Exception(
                "Invalid JSON-RPC response: missing both result and error fields"
            )

        return response["result"]

    def call(self, method: str, params: List[Any] = None) -> Any:
        """
        Call an aria2 RPC method.

        Args:
            method: RPC method name (e.g., "aria2.addUri")
            params: Method parameters (list)

        Returns:
            Result from aria2

        Raises:
            Aria2RpcError: If aria2 returns an error
            Exception: On network or parse errors
        """
        request = self._format_request(method, params)
        request_id = request["id"]

        try:
            response = self._send_request(request)
            return self._parse_response(response, request_id)
        except Aria2RpcError:
            # Re-raise aria2 errors as-is
            raise
        except Exception as e:
            # Wrap other exceptions with context
            raise Exception(
                f"Failed to call {method}: {e}\n"
                f"Request ID: {request_id}\n"
                f"Endpoint: {self.endpoint_url}"
            )

    # Milestone 1 methods

    def add_uri(
        self,
        uris: Union[str, List[str]],
        options: Dict[str, Any] = None,
        position: int = None,
    ) -> str:
        """
        Add a new download task from URIs.

        Args:
            uris: Single URI string or list of URIs
            options: Download options (e.g., {"dir": "/path", "out": "filename"})
            position: Position in download queue (optional)

        Returns:
            GID (Global ID) of the new download task
        """
        # Convert single URI to list
        if isinstance(uris, str):
            uris = [uris]

        params = [uris]
        if options:
            params.append(options)
        if position is not None:
            params.append(position)

        return self.call("aria2.addUri", params)

    def tell_status(self, gid: str, keys: List[str] = None) -> Dict[str, Any]:
        """
        Query status of a download task.

        Args:
            gid: GID of the download task
            keys: Specific keys to retrieve (optional, returns all if None)

        Returns:
            Status dictionary with download information
        """
        params = [gid]
        if keys:
            params.append(keys)

        return self.call("aria2.tellStatus", params)

    def remove(self, gid: str) -> str:
        """
        Remove a download task.

        Args:
            gid: GID of the download task to remove

        Returns:
            GID of the removed task
        """
        return self.call("aria2.remove", [gid])

    def get_global_stat(self) -> Dict[str, Any]:
        """
        Get global statistics.

        Returns:
            Dictionary with global stats (numActive, numWaiting, downloadSpeed, uploadSpeed, etc.)
        """
        return self.call("aria2.getGlobalStat", [])

    # Milestone 2 methods

    def pause(self, gid: str) -> str:
        """
        Pause a download task.

        Args:
            gid: GID of the download task to pause

        Returns:
            GID of the paused task
        """
        return self.call("aria2.pause", [gid])

    def pause_all(self) -> str:
        """
        Pause all active downloads.

        Returns:
            "OK" on success
        """
        return self.call("aria2.pauseAll", [])

    def unpause(self, gid: str) -> str:
        """
        Resume a paused download task.

        Args:
            gid: GID of the download task to resume

        Returns:
            GID of the resumed task
        """
        return self.call("aria2.unpause", [gid])

    def unpause_all(self) -> str:
        """
        Resume all paused downloads.

        Returns:
            "OK" on success
        """
        return self.call("aria2.unpauseAll", [])

    def tell_active(self, keys: List[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of all active downloads.

        Args:
            keys: Specific keys to retrieve for each download (optional)

        Returns:
            List of active download status dictionaries
        """
        params = []
        if keys:
            params.append(keys)
        return self.call("aria2.tellActive", params)

    def tell_waiting(
        self, offset: int = 0, num: int = 100, keys: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of waiting downloads with pagination.

        Args:
            offset: Starting offset in the queue (default: 0)
            num: Number of downloads to retrieve (default: 100)
            keys: Specific keys to retrieve for each download (optional)

        Returns:
            List of waiting download status dictionaries
        """
        params = [offset, num]
        if keys:
            params.append(keys)
        return self.call("aria2.tellWaiting", params)

    def tell_stopped(
        self, offset: int = 0, num: int = 100, keys: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of stopped downloads with pagination.

        Args:
            offset: Starting offset in the queue (default: 0)
            num: Number of downloads to retrieve (default: 100)
            keys: Specific keys to retrieve for each download (optional)

        Returns:
            List of stopped download status dictionaries
        """
        params = [offset, num]
        if keys:
            params.append(keys)
        return self.call("aria2.tellStopped", params)

    def get_option(self, gid: str) -> Dict[str, Any]:
        """
        Get options for a specific download.

        Args:
            gid: GID of the download task

        Returns:
            Dictionary of download options
        """
        return self.call("aria2.getOption", [gid])

    def change_option(self, gid: str, options: Dict[str, Any]) -> str:
        """
        Change options for a specific download.

        Args:
            gid: GID of the download task
            options: Dictionary of options to change

        Returns:
            "OK" on success
        """
        return self.call("aria2.changeOption", [gid, options])

    def get_global_option(self) -> Dict[str, Any]:
        """
        Get global aria2 options.

        Returns:
            Dictionary of global options
        """
        return self.call("aria2.getGlobalOption", [])

    def change_global_option(self, options: Dict[str, Any]) -> str:
        """
        Change global aria2 options.

        Args:
            options: Dictionary of global options to change

        Returns:
            "OK" on success
        """
        return self.call("aria2.changeGlobalOption", [options])

    def purge_download_result(self) -> str:
        """
        Remove completed/error/removed downloads from memory.

        Returns:
            "OK" on success
        """
        return self.call("aria2.purgeDownloadResult", [])

    def remove_download_result(self, gid: str) -> str:
        """
        Remove a specific download result from memory.

        Args:
            gid: GID of the download result to remove

        Returns:
            "OK" on success
        """
        return self.call("aria2.removeDownloadResult", [gid])

    def get_version(self) -> Dict[str, Any]:
        """
        Get aria2 version and enabled features.

        Returns:
            Dictionary with version information
        """
        return self.call("aria2.getVersion", [])

    def list_methods(self) -> List[str]:
        """
        List all available RPC methods.

        Returns:
            List of method names
        """
        return self.call("system.listMethods", [])

    def multicall(self, calls: List[Dict[str, Any]]) -> List[Any]:
        """
        Execute multiple RPC calls in a single request.

        Args:
            calls: List of method call dictionaries with keys:
                   - methodName: str (e.g., "aria2.tellStatus")
                   - params: List[Any]

        Returns:
            List of results corresponding to each call
        """
        return self.call("system.multicall", [calls])

    # Milestone 3 methods

    def add_torrent(
        self,
        torrent: Union[str, bytes],
        uris: List[str] = None,
        options: Dict[str, Any] = None,
        position: int = None,
    ) -> str:
        """
        Add a new download from a torrent file.

        Args:
            torrent: Torrent file path, bytes content, or base64-encoded string
            uris: Web seed URIs (optional)
            options: Download options (optional)
            position: Position in download queue (optional)

        Returns:
            GID (Global ID) of the new torrent download task
        """
        # Convert torrent to base64 if needed
        if isinstance(torrent, str):
            # Check if it's already base64 or a file path
            if os.path.isfile(torrent):
                # Read file and encode to base64
                with open(torrent, "rb") as f:
                    torrent_bytes = f.read()
                torrent_base64 = base64.b64encode(torrent_bytes).decode("utf-8")
            else:
                # Assume it's already base64
                torrent_base64 = torrent
        elif isinstance(torrent, bytes):
            # Encode bytes to base64
            torrent_base64 = base64.b64encode(torrent).decode("utf-8")
        else:
            raise ValueError(
                "torrent must be a file path (str), bytes content, or base64 string"
            )

        params = [torrent_base64]
        if uris:
            params.append(uris)
        elif options or position is not None:
            # If uris is not provided but options/position is, add empty list
            params.append([])

        if options:
            params.append(options)
        elif position is not None:
            # If options is not provided but position is, add empty dict
            params.append({})

        if position is not None:
            params.append(position)

        return self.call("aria2.addTorrent", params)

    def add_metalink(
        self,
        metalink: Union[str, bytes],
        options: Dict[str, Any] = None,
        position: int = None,
    ) -> List[str]:
        """
        Add new downloads from a metalink file.

        Args:
            metalink: Metalink file path, bytes content, or base64-encoded string
            options: Download options (optional)
            position: Position in download queue (optional)

        Returns:
            List of GIDs for each download defined in the metalink
        """
        # Convert metalink to base64 if needed
        if isinstance(metalink, str):
            # Check if it's already base64 or a file path
            if os.path.isfile(metalink):
                # Read file and encode to base64
                with open(metalink, "rb") as f:
                    metalink_bytes = f.read()
                metalink_base64 = base64.b64encode(metalink_bytes).decode("utf-8")
            else:
                # Assume it's already base64
                metalink_base64 = metalink
        elif isinstance(metalink, bytes):
            # Encode bytes to base64
            metalink_base64 = base64.b64encode(metalink).decode("utf-8")
        else:
            raise ValueError(
                "metalink must be a file path (str), bytes content, or base64 string"
            )

        params = [metalink_base64]
        if options:
            params.append(options)
        elif position is not None:
            # If options is not provided but position is, add empty dict
            params.append({})

        if position is not None:
            params.append(position)

        return self.call("aria2.addMetalink", params)


def main():
    """
    Command-line interface for aria2 RPC client.

    Usage:
        python rpc_client.py                              # Test connection
        python rpc_client.py <method>                     # Call method with no params
        python rpc_client.py <method> <param1> ...        # Call method with params

    Examples:
        python rpc_client.py aria2.getGlobalStat
        python rpc_client.py aria2.tellStatus 2089b05ecca3d829
        python rpc_client.py aria2.addUri '["http://example.com/file.zip"]'
        python rpc_client.py aria2.tellWaiting 0 100
    """
    import sys
    import os

    # Add parent directory to path to import config_loader
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from config_loader import Aria2Config

    try:
        # Load configuration
        config_loader = Aria2Config()
        config = config_loader.load()

        # Create RPC client
        client = Aria2RpcClient(config)

        # Parse command-line arguments
        if len(sys.argv) == 1:
            # No arguments: test connection with getGlobalStat
            print("Testing aria2 JSON-RPC client...")
            print()
            print("✓ Configuration loaded")
            print(f"  Endpoint: {config_loader.get_endpoint_url()}")
            print()
            print("Testing connection with aria2.getGlobalStat...")
            stats = client.get_global_stat()
            print("✓ Connection successful")
            print()
            print("Global Statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
        else:
            # Arguments provided: call specified method
            method = sys.argv[1]

            # Parse parameters
            params = []
            for arg in sys.argv[2:]:
                # Try to parse as JSON first (for arrays/objects)
                try:
                    params.append(json.loads(arg))
                except json.JSONDecodeError:
                    # Not JSON, try as integer
                    try:
                        params.append(int(arg))
                    except ValueError:
                        # Not an integer, use as string
                        params.append(arg)

            # Call the method
            result = client.call(method, params)

            # Print result as JSON
            print(json.dumps(result, indent=2, ensure_ascii=False))

    except Aria2RpcError as e:
        print(f"✗ aria2 error: {e}", file=sys.stderr)
        print(f"  Code: {e.code}", file=sys.stderr)
        print(f"  Message: {e.message}", file=sys.stderr)
        if e.data:
            print(f"  Data: {e.data}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
