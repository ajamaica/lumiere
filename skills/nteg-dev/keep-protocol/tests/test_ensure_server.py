#!/usr/bin/env python3
"""KP-11: Tests for client.ensure_server() auto-bootstrap.

Unit tests use mocking to avoid requiring Docker/Go.
Integration tests (marked with @pytest.mark.integration) require a real environment.

Usage:
    # Unit tests only (no Docker/Go needed)
    pytest tests/test_ensure_server.py -v

    # Include integration tests (requires Docker)
    pytest tests/test_ensure_server.py -v -m integration
"""

import socket
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add the Python SDK to path
sys.path.insert(0, str(Path(__file__).parent.parent / "python"))

from keep.client import KeepClient


class TestIsPortOpen:
    """Tests for _is_port_open helper."""

    def test_port_open_returns_true(self):
        """When port is accepting connections, returns True."""
        with patch("socket.socket") as mock_socket:
            mock_sock = MagicMock()
            mock_sock.connect_ex.return_value = 0
            mock_socket.return_value = mock_sock

            result = KeepClient._is_port_open("localhost", 9009)

            assert result is True
            mock_sock.connect_ex.assert_called_once_with(("localhost", 9009))
            mock_sock.close.assert_called_once()

    def test_port_closed_returns_false(self):
        """When port is not accepting connections, returns False."""
        with patch("socket.socket") as mock_socket:
            mock_sock = MagicMock()
            mock_sock.connect_ex.return_value = 111  # Connection refused
            mock_socket.return_value = mock_sock

            result = KeepClient._is_port_open("localhost", 9009)

            assert result is False


class TestHasDocker:
    """Tests for _has_docker helper."""

    def test_docker_available(self):
        """When docker binary exists, returns True."""
        with patch("shutil.which", return_value="/usr/bin/docker"):
            assert KeepClient._has_docker() is True

    def test_docker_not_available(self):
        """When docker binary doesn't exist, returns False."""
        with patch("shutil.which", return_value=None):
            assert KeepClient._has_docker() is False


class TestHasGo:
    """Tests for _has_go helper."""

    def test_go_available(self):
        """When go binary exists, returns True."""
        with patch("shutil.which", return_value="/usr/local/go/bin/go"):
            assert KeepClient._has_go() is True

    def test_go_not_available(self):
        """When go binary doesn't exist, returns False."""
        with patch("shutil.which", return_value=None):
            assert KeepClient._has_go() is False


class TestEnsureServerAlreadyRunning:
    """Tests for ensure_server when server is already running."""

    def test_returns_true_immediately(self):
        """When server already running, returns True without starting anything."""
        with patch.object(KeepClient, "_is_port_open", return_value=True):
            result = KeepClient.ensure_server()

            assert result is True

    def test_does_not_try_docker(self):
        """When server already running, doesn't attempt Docker."""
        with patch.object(KeepClient, "_is_port_open", return_value=True), \
             patch("subprocess.run") as mock_run:
            KeepClient.ensure_server()

            mock_run.assert_not_called()


class TestEnsureServerDockerStart:
    """Tests for ensure_server Docker startup."""

    def test_starts_docker_container(self):
        """When server not running and Docker available, starts container."""
        with patch.object(KeepClient, "_is_port_open", side_effect=[False, True]), \
             patch.object(KeepClient, "_has_docker", return_value=True), \
             patch.object(KeepClient, "_wait_for_server", return_value=True), \
             patch("subprocess.run") as mock_run:
            # Mock docker ps (no existing containers)
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="",
                stderr="",
            )

            result = KeepClient.ensure_server()

            assert result is True
            # Check that docker run was called
            calls = mock_run.call_args_list
            docker_run_call = [c for c in calls if "run" in c[0][0]]
            assert len(docker_run_call) > 0

    def test_docker_run_failure_falls_through(self):
        """When Docker run fails, continues to next method."""
        with patch.object(KeepClient, "_is_port_open", return_value=False), \
             patch.object(KeepClient, "_has_docker", return_value=True), \
             patch.object(KeepClient, "_has_go", return_value=False), \
             patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1,
                stdout="",
                stderr="error",
            )

            result = KeepClient.ensure_server()

            assert result is False


class TestEnsureServerGoFallback:
    """Tests for ensure_server Go fallback."""

    def test_falls_back_to_go_when_docker_unavailable(self):
        """When Docker not available, tries Go."""
        with patch.object(KeepClient, "_is_port_open", side_effect=[False, True]), \
             patch.object(KeepClient, "_has_docker", return_value=False), \
             patch.object(KeepClient, "_has_go", return_value=True), \
             patch.object(KeepClient, "_wait_for_server", return_value=True), \
             patch("subprocess.run") as mock_run, \
             patch("subprocess.Popen") as mock_popen, \
             patch("shutil.which", side_effect=[None, None, "/go/bin/keep-server"]):
            mock_run.return_value = MagicMock(returncode=0, stdout="/go", stderr="")

            result = KeepClient.ensure_server()

            # Verify go install was attempted
            go_install_calls = [
                c for c in mock_run.call_args_list
                if c[0][0][0] == "go" and "install" in c[0][0]
            ]
            assert len(go_install_calls) > 0


class TestEnsureServerBothFail:
    """Tests for ensure_server when both methods fail."""

    def test_returns_false_when_both_unavailable(self):
        """When neither Docker nor Go available, returns False."""
        with patch.object(KeepClient, "_is_port_open", return_value=False), \
             patch.object(KeepClient, "_has_docker", return_value=False), \
             patch.object(KeepClient, "_has_go", return_value=False):
            result = KeepClient.ensure_server()

            assert result is False


class TestWaitForServer:
    """Tests for _wait_for_server helper."""

    def test_returns_true_when_server_becomes_available(self):
        """When server becomes available within timeout, returns True."""
        call_count = [0]

        def is_open_eventually(*args):
            call_count[0] += 1
            return call_count[0] >= 3  # Available on third check

        with patch.object(KeepClient, "_is_port_open", side_effect=is_open_eventually), \
             patch("time.sleep"):
            result = KeepClient._wait_for_server("localhost", 9009, timeout=5.0)

            assert result is True

    def test_returns_false_on_timeout(self):
        """When server never becomes available, returns False after timeout."""
        with patch.object(KeepClient, "_is_port_open", return_value=False), \
             patch("time.sleep"), \
             patch("time.monotonic", side_effect=[0, 1, 2, 3, 4, 5, 6]):
            result = KeepClient._wait_for_server("localhost", 9009, timeout=5.0)

            assert result is False


class TestModuleLevelFunction:
    """Tests for the module-level ensure_server function."""

    def test_calls_class_method(self):
        """Module function delegates to KeepClient.ensure_server."""
        from keep import ensure_server

        with patch.object(KeepClient, "ensure_server", return_value=True) as mock:
            result = ensure_server()

            assert result is True
            mock.assert_called_once()


# Integration tests (require Docker)
@pytest.mark.integration
class TestEnsureServerIntegration:
    """Integration tests that actually start a server.

    These tests are slow and require Docker. Run with:
        pytest tests/test_ensure_server.py -v -m integration
    """

    def test_starts_and_connects(self):
        """Can start a server and connect to it."""
        import subprocess

        # Clean up any existing container
        subprocess.run(
            ["docker", "rm", "-f", "keep-server-9009"],
            capture_output=True,
        )

        try:
            result = KeepClient.ensure_server(timeout=60)
            assert result is True

            # Verify we can connect
            client = KeepClient()
            reply = client.send("ping")
            assert reply.body == "done"
        finally:
            # Cleanup
            subprocess.run(
                ["docker", "rm", "-f", "keep-server-9009"],
                capture_output=True,
            )


if __name__ == "__main__":
    # Run with pytest
    pytest.main([__file__, "-v", "--tb=short"])
