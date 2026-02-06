"""keep-protocol: Signed agent-to-agent communication over TCP."""

from keep.client import KeepClient

__version__ = "0.5.0"
__all__ = ["KeepClient", "ensure_server"]


def ensure_server(
    host: str = "localhost",
    port: int = 9009,
    timeout: float = 30.0,
) -> bool:
    """Ensure a keep-protocol server is running.

    Convenience wrapper around KeepClient.ensure_server().

    Example:
        >>> from keep import ensure_server, KeepClient
        >>> if ensure_server():
        ...     client = KeepClient()
        ...     reply = client.send("hello")
    """
    return KeepClient.ensure_server(host=host, port=port, timeout=timeout)
