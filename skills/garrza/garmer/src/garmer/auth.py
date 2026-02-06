"""Authentication handler for Garmin Connect using garth library."""

import json
import logging
from pathlib import Path
from typing import Any

import garth
from garth.exc import GarthException, GarthHTTPError

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised when authentication with Garmin Connect fails."""

    pass


class SessionExpiredError(AuthenticationError):
    """Raised when the Garmin Connect session has expired."""

    pass


class GarminAuth:
    """
    Handle Garmin Connect authentication.

    Uses the garth library for OAuth-based authentication with Garmin Connect.
    Supports saving and loading session tokens for persistent authentication.
    """

    DEFAULT_TOKEN_DIR = Path.home() / ".garmer"
    DEFAULT_TOKEN_FILE = "garmin_tokens"

    def __init__(
        self,
        token_dir: Path | str | None = None,
        token_file: str | None = None,
    ):
        """
        Initialize the authentication handler.

        Args:
            token_dir: Directory to store authentication tokens.
                      Defaults to ~/.garmer
            token_file: Name of the token file. Defaults to 'garmin_tokens'
        """
        self.token_dir = Path(token_dir) if token_dir else self.DEFAULT_TOKEN_DIR
        self.token_file = token_file or self.DEFAULT_TOKEN_FILE
        self._is_authenticated = False

    @property
    def token_path(self) -> Path:
        """Get the full path to the token file."""
        return self.token_dir / self.token_file

    @property
    def is_authenticated(self) -> bool:
        """Check if currently authenticated."""
        return self._is_authenticated

    def login(self, email: str, password: str, save_tokens: bool = True) -> bool:
        """
        Authenticate with Garmin Connect using email and password.

        Args:
            email: Garmin Connect email address
            password: Garmin Connect password
            save_tokens: Whether to save tokens for future use

        Returns:
            True if authentication was successful

        Raises:
            AuthenticationError: If authentication fails
        """
        try:
            logger.info("Attempting to log in to Garmin Connect...")
            garth.login(email, password)
            self._is_authenticated = True
            logger.info("Successfully logged in to Garmin Connect")

            if save_tokens:
                self.save_tokens()

            return True

        except GarthHTTPError as e:
            logger.error(f"HTTP error during login: {e}")
            raise AuthenticationError(f"Failed to authenticate: {e}") from e
        except GarthException as e:
            logger.error(f"Garth error during login: {e}")
            raise AuthenticationError(f"Authentication error: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error during login: {e}")
            raise AuthenticationError(f"Unexpected authentication error: {e}") from e

    def save_tokens(self) -> None:
        """
        Save authentication tokens to disk.

        Creates the token directory if it doesn't exist.
        """
        try:
            self.token_dir.mkdir(parents=True, exist_ok=True)
            garth.save(self.token_path)
            logger.info(f"Saved authentication tokens to {self.token_path}")
        except Exception as e:
            logger.warning(f"Failed to save tokens: {e}")

    def load_tokens(self) -> bool:
        """
        Load authentication tokens from disk.

        Returns:
            True if tokens were loaded successfully and are valid
        """
        if not self.token_path.exists():
            logger.debug(f"No token file found at {self.token_path}")
            return False

        try:
            garth.resume(self.token_path)
            self._is_authenticated = True
            logger.info("Successfully loaded authentication tokens")
            return True
        except GarthException as e:
            logger.warning(f"Failed to load tokens: {e}")
            return False
        except Exception as e:
            logger.warning(f"Unexpected error loading tokens: {e}")
            return False

    def logout(self, delete_tokens: bool = True) -> None:
        """
        Log out and optionally delete saved tokens.

        Args:
            delete_tokens: Whether to delete the saved token file
        """
        self._is_authenticated = False

        if delete_tokens and self.token_path.exists():
            try:
                self.token_path.unlink()
                logger.info("Deleted authentication tokens")
            except Exception as e:
                logger.warning(f"Failed to delete tokens: {e}")

    def ensure_authenticated(self) -> None:
        """
        Ensure we have valid authentication.

        First tries to load saved tokens, then raises an error if not authenticated.

        Raises:
            AuthenticationError: If not authenticated and no saved tokens
        """
        if self._is_authenticated:
            return

        if self.load_tokens():
            return

        raise AuthenticationError(
            "Not authenticated. Please call login() with your credentials first."
        )

    def refresh_if_needed(self) -> bool:
        """
        Refresh the authentication token if needed.

        Returns:
            True if refresh was successful or not needed
        """
        try:
            # garth handles token refresh automatically
            # This method can be called to ensure tokens are current
            if self._is_authenticated:
                self.save_tokens()  # Save refreshed tokens
            return True
        except GarthException as e:
            logger.warning(f"Failed to refresh token: {e}")
            self._is_authenticated = False
            return False

    def get_client(self) -> garth.Client:
        """
        Get the underlying garth client for direct API calls.

        Returns:
            The garth Client instance

        Raises:
            AuthenticationError: If not authenticated
        """
        self.ensure_authenticated()
        return garth.client

    def request(
        self,
        method: str,
        endpoint: str,
        api_base: str = "connectapi",
        **kwargs: Any,
    ) -> Any:
        """
        Make an authenticated request to the Garmin Connect API.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            api_base: API base to use (connectapi, gcs, etc.)
            **kwargs: Additional arguments passed to the request

        Returns:
            The response data

        Raises:
            AuthenticationError: If not authenticated
            SessionExpiredError: If the session has expired
        """
        self.ensure_authenticated()

        try:
            if api_base == "connectapi":
                response = garth.connectapi(endpoint, method=method, **kwargs)
            else:
                # For other APIs, use the generic request
                client = garth.client
                response = client.request(method, api_base, endpoint, **kwargs)
            return response
        except GarthHTTPError as e:
            if e.status == 401:
                self._is_authenticated = False
                raise SessionExpiredError("Session expired. Please log in again.") from e
            raise
        except GarthException as e:
            logger.error(f"API request failed: {e}")
            raise


def create_auth(
    email: str | None = None,
    password: str | None = None,
    token_dir: Path | str | None = None,
    auto_login: bool = True,
) -> GarminAuth:
    """
    Create and optionally authenticate a GarminAuth instance.

    This is a convenience function that:
    1. Creates a GarminAuth instance
    2. Tries to load saved tokens
    3. If no saved tokens and credentials provided, performs login

    Args:
        email: Garmin Connect email (optional if tokens are saved)
        password: Garmin Connect password (optional if tokens are saved)
        token_dir: Directory for token storage
        auto_login: Whether to automatically login if credentials provided

    Returns:
        An authenticated GarminAuth instance

    Raises:
        AuthenticationError: If authentication fails
    """
    auth = GarminAuth(token_dir=token_dir)

    # Try to load existing tokens first
    if auth.load_tokens():
        logger.info("Using saved authentication tokens")
        return auth

    # If no saved tokens and credentials provided, try to login
    if auto_login and email and password:
        auth.login(email, password)
        return auth

    # Return unauthenticated auth instance
    return auth
