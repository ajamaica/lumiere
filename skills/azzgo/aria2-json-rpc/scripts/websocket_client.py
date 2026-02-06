#!/usr/bin/env python3
"""
WebSocket client for aria2 JSON-RPC 2.0.

Provides persistent WebSocket connection for:
- Sending JSON-RPC requests over WebSocket
- Receiving server notifications (events)
- Automatic reconnection on connection loss

This module requires the 'websockets' library (optional dependency).
If not available, the skill falls back to HTTP POST transport.
"""

import json
import asyncio
import sys
from typing import Any, Dict, List, Optional, Callable
from dependency_check import check_optional_websockets

# Check if websockets is available
WEBSOCKET_AVAILABLE = check_optional_websockets()

if WEBSOCKET_AVAILABLE:
    import websockets
    from websockets.client import WebSocketClientProtocol


class Aria2WebSocketError(Exception):
    """Raised when WebSocket operation fails."""

    pass


class Aria2WebSocketClient:
    """
    WebSocket client for aria2 JSON-RPC 2.0.

    Manages persistent WebSocket connection with:
    - Event notification handling
    - Automatic reconnection
    - Request/response correlation
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize WebSocket client.

        Args:
            config: Dictionary with keys: host, port, secret, secure, timeout
        """
        if not WEBSOCKET_AVAILABLE:
            raise ImportError(
                "websockets library not available. Install with: pip install websockets"
            )

        self.config = config
        self.ws_url = self._build_ws_url()
        self.connection: Optional[WebSocketClientProtocol] = None
        self.request_counter = 0
        self.event_handlers: Dict[str, List[Callable]] = {}
        self.reconnect_enabled = True
        self.reconnect_delay = 5  # seconds
        self._running = False

    def _build_ws_url(self) -> str:
        """Build the WebSocket endpoint URL."""
        protocol = "wss" if self.config.get("secure", False) else "ws"
        host = self.config["host"]
        port = self.config["port"]
        return f"{protocol}://{host}:{port}/jsonrpc"

    def _generate_request_id(self) -> str:
        """Generate a unique request ID."""
        self.request_counter += 1
        return f"ws-aria2-rpc-{self.request_counter}"

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

    def register_event_handler(self, event: str, handler: Callable):
        """
        Register a callback for a specific aria2 event.

        Args:
            event: Event name (e.g., "aria2.onDownloadStart")
            handler: Callback function that accepts event data
        """
        if event not in self.event_handlers:
            self.event_handlers[event] = []
        self.event_handlers[event].append(handler)

    def unregister_event_handler(self, event: str, handler: Callable):
        """
        Unregister a callback for a specific aria2 event.

        Args:
            event: Event name
            handler: Callback function to remove
        """
        if event in self.event_handlers:
            self.event_handlers[event].remove(handler)

    async def connect(self):
        """
        Establish WebSocket connection to aria2.

        Raises:
            Aria2WebSocketError: If connection fails
        """
        try:
            timeout_sec = self.config.get("timeout", 30000) / 1000.0
            extra_headers = {
                "User-Agent": "aria2-json-rpc-client/1.0",
            }
            self.connection = await asyncio.wait_for(
                websockets.connect(self.ws_url, extra_headers=extra_headers),
                timeout=timeout_sec,
            )
            print(f"✓ WebSocket connected to {self.ws_url}")
        except asyncio.TimeoutError:
            raise Aria2WebSocketError(
                f"Connection timeout to {self.ws_url} (timeout: {timeout_sec}s)"
            )
        except Exception as e:
            raise Aria2WebSocketError(f"Failed to connect to {self.ws_url}: {e}")

    async def disconnect(self):
        """Close the WebSocket connection."""
        if self.connection:
            await self.connection.close()
            self.connection = None
            print("✓ WebSocket disconnected")

    async def send_request(self, method: str, params: List[Any] = None) -> Any:
        """
        Send a JSON-RPC request over WebSocket and wait for response.

        Args:
            method: RPC method name (e.g., "aria2.addUri")
            params: Method parameters (list)

        Returns:
            Result from aria2

        Raises:
            Aria2WebSocketError: If not connected or request fails
        """
        if not self.connection:
            raise Aria2WebSocketError("Not connected to aria2 WebSocket")

        if params is None:
            params = []

        # Inject token for aria2.* methods
        if method.startswith("aria2."):
            params = self._inject_token(params)

        request = {
            "jsonrpc": "2.0",
            "id": self._generate_request_id(),
            "method": method,
            "params": params,
        }

        request_id = request["id"]

        try:
            # Send request
            await self.connection.send(json.dumps(request))

            # Wait for response
            while True:
                response_str = await self.connection.recv()
                response = json.loads(response_str)

                # Check if this is a notification (no id field)
                if "id" not in response:
                    # Handle server notification
                    await self._handle_notification(response)
                    continue

                # Check if this response matches our request
                if response.get("id") == request_id:
                    return self._parse_response(response, request_id)

        except websockets.exceptions.ConnectionClosed as e:
            raise Aria2WebSocketError(f"Connection closed: {e}")
        except json.JSONDecodeError as e:
            raise Aria2WebSocketError(f"Invalid JSON response: {e}")
        except Exception as e:
            raise Aria2WebSocketError(f"Request failed: {e}")

    def _parse_response(self, response: Dict[str, Any], request_id: str) -> Any:
        """
        Parse JSON-RPC 2.0 response.

        Args:
            response: JSON-RPC response dictionary
            request_id: Request ID for correlation

        Returns:
            Result value from response

        Raises:
            Aria2WebSocketError: If response contains an error
        """
        if "error" in response:
            error = response["error"]
            raise Aria2WebSocketError(
                f"aria2 RPC error [{error.get('code', -1)}]: {error.get('message', 'Unknown error')}"
            )

        if "result" not in response:
            raise Aria2WebSocketError(
                "Invalid JSON-RPC response: missing both result and error fields"
            )

        return response["result"]

    async def _handle_notification(self, notification: Dict[str, Any]):
        """
        Handle server-side notification (event).

        Args:
            notification: Notification message from aria2
        """
        method = notification.get("method")
        params = notification.get("params", [])

        if method and method in self.event_handlers:
            # Call all registered handlers for this event
            for handler in self.event_handlers[method]:
                try:
                    # Call handler (can be sync or async)
                    if asyncio.iscoroutinefunction(handler):
                        await handler(params)
                    else:
                        handler(params)
                except Exception as e:
                    print(f"Error in event handler for {method}: {e}", file=sys.stderr)

    async def listen_for_events(self):
        """
        Listen for server notifications indefinitely.

        This method should be run in a background task to handle
        aria2 event notifications like onDownloadStart, onDownloadComplete, etc.
        """
        if not self.connection:
            raise Aria2WebSocketError("Not connected to aria2 WebSocket")

        self._running = True

        try:
            while self._running:
                try:
                    message_str = await self.connection.recv()
                    message = json.loads(message_str)

                    # Handle notifications (messages without id field)
                    if "id" not in message and "method" in message:
                        await self._handle_notification(message)

                except websockets.exceptions.ConnectionClosed:
                    if self.reconnect_enabled and self._running:
                        print(
                            f"Connection lost. Reconnecting in {self.reconnect_delay} seconds..."
                        )
                        await asyncio.sleep(self.reconnect_delay)
                        await self.connect()
                    else:
                        break
                except json.JSONDecodeError as e:
                    print(f"Invalid JSON notification: {e}", file=sys.stderr)
                except Exception as e:
                    print(f"Error in event listener: {e}", file=sys.stderr)

        except asyncio.CancelledError:
            print("Event listener cancelled")
        finally:
            self._running = False

    def stop_listening(self):
        """Stop the event listener loop."""
        self._running = False


def check_websocket_available() -> bool:
    """
    Check if WebSocket functionality is available.

    Returns:
        bool: True if websockets library is installed, False otherwise
    """
    return WEBSOCKET_AVAILABLE


# Example usage
async def example_usage():
    """Example of using the WebSocket client."""
    config = {
        "host": "localhost",
        "port": 6800,
        "secret": None,
        "secure": False,
        "timeout": 30000,
    }

    client = Aria2WebSocketClient(config)

    # Register event handlers
    def on_download_start(params):
        gid = params[0]["gid"] if params else "unknown"
        print(f"Download started: GID {gid}")

    def on_download_complete(params):
        gid = params[0]["gid"] if params else "unknown"
        print(f"Download completed: GID {gid}")

    client.register_event_handler("aria2.onDownloadStart", on_download_start)
    client.register_event_handler("aria2.onDownloadComplete", on_download_complete)

    try:
        # Connect
        await client.connect()

        # Start event listener in background
        listener_task = asyncio.create_task(client.listen_for_events())

        # Send a request
        result = await client.send_request(
            "aria2.addUri", [["http://example.com/file.zip"]]
        )
        print(f"Download added: GID {result}")

        # Keep running to receive events
        await asyncio.sleep(60)

        # Stop listening and disconnect
        client.stop_listening()
        await listener_task
        await client.disconnect()

    except Aria2WebSocketError as e:
        print(f"WebSocket error: {e}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    if not WEBSOCKET_AVAILABLE:
        print("ERROR: websockets library not available")
        print("Install with: pip install websockets")
        sys.exit(1)

    print("Running WebSocket client example...")
    asyncio.run(example_usage())
