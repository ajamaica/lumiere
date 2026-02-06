"""HTTP client for PocketSmith API with automatic authentication."""

from typing import Any, Optional

import httpx

from .auth import get_developer_key

BASE_URL = "https://api.pocketsmith.com/v2"


class PocketSmithClient:
    """HTTP client for the PocketSmith API."""

    def __init__(self):
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.Client(
                base_url=BASE_URL,
                timeout=30.0,
            )
        return self._client

    def _get_headers(self) -> dict[str, str]:
        """Get request headers with developer key."""
        key = get_developer_key()
        return {
            "X-Developer-Key": key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict[str, Any]] = None,
        json_data: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any] | list[Any] | None:
        """Make an authenticated request to the API.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            path: API path (e.g., "/transactions/123")
            params: Query parameters
            json_data: JSON body data

        Returns:
            JSON response data (dict, list, or None for 204 responses)

        Raises:
            APIError: If the API returns an error status code
        """
        client = self._get_client()
        headers = self._get_headers()

        response = client.request(
            method=method,
            url=path,
            params=params,
            json=json_data,
            headers=headers,
        )

        if response.status_code >= 400:
            error_detail = response.text
            try:
                error_json = response.json()
                if "error" in error_json:
                    error_detail = error_json["error"]
                elif "message" in error_json:
                    error_detail = error_json["message"]
            except Exception:
                pass
            raise APIError(response.status_code, error_detail)

        # Handle 204 No Content (e.g., successful DELETE)
        if response.status_code == 204:
            return None

        return response.json()

    def get(self, path: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any] | list[Any]:
        """Make a GET request."""
        result = self._request("GET", path, params=params)
        return result if result is not None else {}

    def post(
        self, path: str, json_data: Optional[dict[str, Any]] = None, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Make a POST request."""
        result = self._request("POST", path, params=params, json_data=json_data)
        return result if result is not None else {}

    def put(
        self, path: str, json_data: Optional[dict[str, Any]] = None, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Make a PUT request."""
        result = self._request("PUT", path, params=params, json_data=json_data)
        return result if result is not None else {}

    def delete(self, path: str, params: Optional[dict[str, Any]] = None) -> None:
        """Make a DELETE request."""
        self._request("DELETE", path, params=params)

    def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            self._client.close()
            self._client = None

    def __enter__(self) -> "PocketSmithClient":
        return self

    def __exit__(self, *args) -> None:
        self.close()


class APIError(Exception):
    """API error with status code and message."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"API Error {status_code}: {message}")
