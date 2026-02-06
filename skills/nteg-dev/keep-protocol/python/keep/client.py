"""Keep protocol client -- sign and send packets over TCP."""

import json
import logging
import shutil
import socket
import struct
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from keep import keep_pb2

logger = logging.getLogger(__name__)

MAX_PACKET_SIZE = 65536


class KeepClient:
    """Client for the keep-protocol server.

    Generates an ephemeral ed25519 keypair on init (or accepts an existing one).
    Signs every outgoing packet.

    Supports two modes:
      - Ephemeral (default): opens/closes a TCP connection per send() call.
      - Persistent: call connect() or use as context manager to hold a connection
        open for sending and receiving routed messages via listen().
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 9009,
        private_key: Optional[Ed25519PrivateKey] = None,
        timeout: float = 10.0,
        src: Optional[str] = None,
    ):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.src = src or "bot:keep-client"
        self._private_key = private_key or Ed25519PrivateKey.generate()
        self._public_key = self._private_key.public_key()
        self._pk_bytes = self._public_key.public_bytes_raw()
        self._sock: Optional[socket.socket] = None

    # -- Server bootstrap --

    @staticmethod
    def _is_port_open(host: str, port: int, timeout: float = 1.0) -> bool:
        """Check if a TCP port is accepting connections."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            result = sock.connect_ex((host, port))
            return result == 0
        finally:
            sock.close()

    @staticmethod
    def _has_docker() -> bool:
        """Check if Docker is available."""
        return shutil.which("docker") is not None

    @staticmethod
    def _has_go() -> bool:
        """Check if Go is available."""
        return shutil.which("go") is not None

    @classmethod
    def ensure_server(
        cls,
        host: str = "localhost",
        port: int = 9009,
        timeout: float = 30.0,
        docker_image: str = "ghcr.io/clcrawford-dev/keep-server:latest",
    ) -> bool:
        """Ensure a keep-protocol server is running, starting one if needed.

        Checks if the server is reachable. If not, attempts to start one using:
        1. Docker (preferred): pulls and runs the multi-arch image
        2. Go fallback: installs and runs via `go install`

        Args:
            host: Server hostname (default: localhost).
            port: Server port (default: 9009).
            timeout: Max seconds to wait for server to become ready.
            docker_image: Docker image to use.

        Returns:
            True if server is now reachable, False otherwise.

        Example:
            >>> from keep import KeepClient
            >>> if KeepClient.ensure_server():
            ...     client = KeepClient()
            ...     client.connect()
        """
        # Check if already running
        if cls._is_port_open(host, port):
            logger.info("keep-server already running on %s:%d", host, port)
            return True

        logger.info("keep-server not running on %s:%d, attempting to start...", host, port)

        # Try Docker first
        if cls._has_docker():
            logger.info("Docker detected, attempting to start container...")
            try:
                # Check if container already exists but stopped
                result = subprocess.run(
                    ["docker", "ps", "-a", "--filter", f"publish={port}", "--format", "{{.ID}}"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                existing_containers = result.stdout.strip().split('\n')
                existing_containers = [c for c in existing_containers if c]

                # Remove existing containers on this port
                for container_id in existing_containers:
                    subprocess.run(
                        ["docker", "rm", "-f", container_id],
                        capture_output=True,
                        timeout=10,
                    )

                # Start new container
                result = subprocess.run(
                    [
                        "docker", "run", "-d",
                        "--name", f"keep-server-{port}",
                        "-p", f"{port}:9009",
                        docker_image,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60,  # Image pull may take time
                )

                if result.returncode == 0:
                    container_id = result.stdout.strip()[:12]
                    logger.info("Started Docker container: %s", container_id)

                    # Wait for server to be ready
                    if cls._wait_for_server(host, port, timeout):
                        logger.info("keep-server ready via Docker on %s:%d", host, port)
                        return True
                    else:
                        logger.warning("Docker container started but server not responding")
                else:
                    logger.warning("Docker run failed: %s", result.stderr.strip())

            except subprocess.TimeoutExpired:
                logger.warning("Docker command timed out")
            except Exception as e:
                logger.warning("Docker start failed: %s", e)

        # Fall back to Go
        if cls._has_go():
            logger.info("Trying Go fallback...")
            try:
                # Install the server binary
                result = subprocess.run(
                    ["go", "install", "github.com/clcrawford-dev/keep-server@latest"],
                    capture_output=True,
                    text=True,
                    timeout=120,
                )

                if result.returncode != 0:
                    logger.warning("go install failed: %s", result.stderr.strip())
                else:
                    # Find the installed binary
                    go_bin = shutil.which("keep-server")
                    if not go_bin:
                        # Check GOPATH/bin
                        gopath_result = subprocess.run(
                            ["go", "env", "GOPATH"],
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        if gopath_result.returncode == 0:
                            gopath = gopath_result.stdout.strip()
                            go_bin = Path(gopath) / "bin" / "keep-server"
                            if not go_bin.exists():
                                go_bin = None

                    if go_bin:
                        # Start server in background
                        subprocess.Popen(
                            [str(go_bin)],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                            start_new_session=True,
                        )
                        logger.info("Started keep-server via Go")

                        if cls._wait_for_server(host, port, timeout):
                            logger.info("keep-server ready via Go on %s:%d", host, port)
                            return True
                    else:
                        logger.warning("keep-server binary not found after go install")

            except subprocess.TimeoutExpired:
                logger.warning("Go install timed out")
            except Exception as e:
                logger.warning("Go start failed: %s", e)

        # Both methods failed
        logger.error(
            "Could not start keep-server. Install Docker or Go, or run manually:\n"
            "  docker run -d -p 9009:9009 %s\n"
            "  OR\n"
            "  go install github.com/clcrawford-dev/keep-server@latest && keep-server",
            docker_image,
        )
        return False

    @classmethod
    def _wait_for_server(cls, host: str, port: int, timeout: float) -> bool:
        """Wait for the server to become reachable."""
        start = time.monotonic()
        while time.monotonic() - start < timeout:
            if cls._is_port_open(host, port):
                return True
            time.sleep(0.5)
        return False

    # -- Connection management --

    def connect(self) -> None:
        """Open a persistent TCP connection to the server."""
        if self._sock is not None:
            return
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        s.connect((self.host, self.port))
        self._sock = s

    def disconnect(self) -> None:
        """Close the persistent connection."""
        if self._sock is not None:
            try:
                self._sock.close()
            except OSError:
                pass
            self._sock = None

    def __enter__(self) -> "KeepClient":
        self.connect()
        return self

    def __exit__(self, *exc) -> None:
        self.disconnect()

    # -- Framing helpers --

    @staticmethod
    def _recv_exact(sock: socket.socket, n: int) -> bytes:
        """Read exactly n bytes from sock."""
        chunks = []
        remaining = n
        while remaining > 0:
            chunk = sock.recv(min(remaining, 4096))
            if not chunk:
                raise ConnectionError(
                    f"Connection closed: expected {n} bytes, got {n - remaining}"
                )
            chunks.append(chunk)
            remaining -= len(chunk)
        return b"".join(chunks)

    @staticmethod
    def _send_framed(sock: socket.socket, data: bytes) -> None:
        """Send data with a 4-byte big-endian length prefix."""
        if len(data) > MAX_PACKET_SIZE:
            raise ValueError(f"Packet too large: {len(data)} > {MAX_PACKET_SIZE}")
        header = struct.pack(">I", len(data))
        sock.sendall(header + data)

    @classmethod
    def _recv_framed(cls, sock: socket.socket) -> bytes:
        """Read a length-prefixed frame: 4-byte BE header + payload."""
        header = cls._recv_exact(sock, 4)
        (msg_len,) = struct.unpack(">I", header)
        if msg_len == 0:
            raise ConnectionError("Received zero-length frame")
        if msg_len > MAX_PACKET_SIZE:
            raise ConnectionError(f"Frame too large: {msg_len} > {MAX_PACKET_SIZE}")
        return cls._recv_exact(sock, msg_len)

    @classmethod
    def _read_packet(cls, sock: socket.socket) -> keep_pb2.Packet:
        """Read and parse one framed Packet from sock."""
        data = cls._recv_framed(sock)
        p = keep_pb2.Packet()
        p.ParseFromString(data)
        return p

    # -- Signing --

    def _sign_packet(
        self,
        body: str,
        src: Optional[str] = None,
        dst: str = "server",
        typ: int = 0,
        fee: int = 0,
        ttl: int = 60,
        msg_id: Optional[str] = None,
        scar: bytes = b"",
    ) -> bytes:
        """Build, sign, and serialize a Packet. Returns wire bytes."""
        msg_id = msg_id or str(uuid.uuid4())
        src = src or self.src

        p = keep_pb2.Packet()
        p.typ = typ
        p.id = msg_id
        p.src = src
        p.dst = dst
        p.body = body
        p.fee = fee
        p.ttl = ttl
        p.scar = scar

        sign_payload = p.SerializeToString()
        sig_bytes = self._private_key.sign(sign_payload)

        p.sig = sig_bytes
        p.pk = self._pk_bytes
        return p.SerializeToString()

    # -- Send --

    def send(
        self,
        body: str,
        src: Optional[str] = None,
        dst: str = "server",
        typ: int = 0,
        fee: int = 0,
        ttl: int = 60,
        msg_id: Optional[str] = None,
        scar: bytes = b"",
        wait_reply: Optional[bool] = None,
    ) -> Optional[keep_pb2.Packet]:
        """Sign and send a packet.

        In ephemeral mode (no connect() called): opens a connection, sends,
        reads the reply, and closes. Always returns the server's reply.

        In persistent mode: sends on the open connection.
          - wait_reply=True: blocks until a reply is received and returns it.
          - wait_reply=False: sends without waiting. Returns None.
          - wait_reply=None (default): waits if dst is "server" or "",
            does not wait otherwise.
        """
        wire_data = self._sign_packet(
            body=body,
            src=src,
            dst=dst,
            typ=typ,
            fee=fee,
            ttl=ttl,
            msg_id=msg_id,
            scar=scar,
        )

        if self._sock is not None:
            # Persistent mode
            self._send_framed(self._sock, wire_data)

            should_wait = wait_reply
            if should_wait is None:
                should_wait = dst in ("server", "") or dst.startswith("discover:")

            if should_wait:
                return self._read_packet(self._sock)
            return None

        # Ephemeral mode — open/close per call
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        try:
            s.connect((self.host, self.port))
            self._send_framed(s, wire_data)
            reply_data = self._recv_framed(s)
        finally:
            s.close()

        resp = keep_pb2.Packet()
        resp.ParseFromString(reply_data)
        return resp

    # -- Listen --

    def listen(
        self,
        callback: Callable[[keep_pb2.Packet], None],
        timeout: Optional[float] = None,
    ) -> None:
        """Block and read packets from the persistent connection.

        Invokes callback(packet) for each received packet.
        Heartbeat packets (typ=2) are silently filtered.

        Args:
            callback: Called with each received Packet.
            timeout: Seconds to listen before returning. None = listen until
                     the connection closes or an error occurs.

        Raises:
            RuntimeError: If not connected (call connect() first).
        """
        if self._sock is None:
            raise RuntimeError("Not connected. Call connect() first.")

        if timeout is not None:
            self._sock.settimeout(timeout)

        try:
            while True:
                p = self._read_packet(self._sock)
                # Filter heartbeat packets
                if p.typ == 2:
                    continue
                callback(p)
        except socket.timeout:
            return
        except ConnectionError:
            return
        finally:
            if timeout is not None:
                self._sock.settimeout(self.timeout)

    # -- Discovery --

    def discover(self, query: str = "info") -> dict:
        """Send a discovery query and return parsed JSON response.

        Args:
            query: Discovery type — "info", "agents", or "stats".

        Returns:
            Parsed JSON dict from the server's response body.
        """
        reply = self.send(body="", dst=f"discover:{query}")
        return json.loads(reply.body)

    def discover_agents(self) -> list:
        """Return list of currently connected agent identities."""
        info = self.discover("agents")
        return info.get("agents", [])

    # -- Endpoint caching --

    _CACHE_DIR = Path.home() / ".keep"
    _CACHE_FILE = _CACHE_DIR / "endpoints.json"

    @staticmethod
    def cache_endpoint(host: str, port: int, info: dict) -> None:
        """Cache a discovered endpoint in ~/.keep/endpoints.json.

        Args:
            host: Server hostname or IP.
            port: Server port.
            info: Server info dict (from discover("info")).
        """
        cache_dir = Path.home() / ".keep"
        cache_file = cache_dir / "endpoints.json"

        # Load existing cache
        endpoints = []
        if cache_file.exists():
            try:
                data = json.loads(cache_file.read_text())
                endpoints = data.get("endpoints", [])
            except (json.JSONDecodeError, OSError):
                endpoints = []

        # Update or append
        now = datetime.now(timezone.utc).isoformat()
        entry = {
            "host": host,
            "port": port,
            "version": info.get("version", ""),
            "agents_online": info.get("agents_online", 0),
            "last_seen": now,
        }

        updated = False
        for i, ep in enumerate(endpoints):
            if ep.get("host") == host and ep.get("port") == port:
                endpoints[i] = entry
                updated = True
                break
        if not updated:
            endpoints.append(entry)

        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps({"endpoints": endpoints}, indent=2))

    @classmethod
    def from_cache(
        cls,
        src: str = "bot:keep-client",
        private_key: Optional[Ed25519PrivateKey] = None,
        timeout: float = 5.0,
    ) -> "KeepClient":
        """Create a client by trying cached endpoints.

        Reads ~/.keep/endpoints.json and attempts to connect to each
        endpoint in order, returning the first successful connection.

        Args:
            src: Agent identity for this client.
            private_key: Optional ed25519 private key.
            timeout: Connection timeout per endpoint attempt.

        Returns:
            A connected KeepClient instance.

        Raises:
            ConnectionError: If no cached endpoint is reachable.
        """
        cache_file = Path.home() / ".keep" / "endpoints.json"
        if not cache_file.exists():
            raise ConnectionError("No cached endpoints (~/.keep/endpoints.json not found)")

        try:
            data = json.loads(cache_file.read_text())
            endpoints = data.get("endpoints", [])
        except (json.JSONDecodeError, OSError) as e:
            raise ConnectionError(f"Failed to read endpoint cache: {e}")

        if not endpoints:
            raise ConnectionError("Endpoint cache is empty")

        last_error = None
        for ep in endpoints:
            host = ep.get("host", "localhost")
            port = ep.get("port", 9009)
            try:
                client = cls(
                    host=host,
                    port=port,
                    private_key=private_key,
                    timeout=timeout,
                    src=src,
                )
                # Test the connection
                info = client.discover("info")
                client.cache_endpoint(host, port, info)
                return client
            except (OSError, ConnectionError, json.JSONDecodeError) as e:
                last_error = e
                continue

        raise ConnectionError(f"No cached endpoint reachable (last error: {last_error})")
