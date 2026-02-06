"""HTTP client for Sharesight API with automatic token management."""

from typing import Any, Optional

import httpx

from .auth import get_token, clear_token

BASE_URL = "https://api.sharesight.com/api/v3"
BASE_URL_V2 = "https://api.sharesight.com/api/v2"


class SharesightClient:
    """HTTP client for the Sharesight API."""

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
        """Get request headers with current access token."""
        token = get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict[str, Any]] = None,
        json_data: Optional[dict[str, Any]] = None,
        retry_on_401: bool = True,
    ) -> dict[str, Any]:
        """Make an authenticated request to the API.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: API path (e.g., "/portfolios")
            params: Query parameters
            json_data: JSON body data
            retry_on_401: Whether to retry with fresh token on 401

        Returns:
            JSON response data
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

        # Handle 401 by refreshing token and retrying once
        if response.status_code == 401 and retry_on_401:
            clear_token()
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
                if "reason" in error_json:
                    error_detail = error_json["reason"]
                elif "error" in error_json:
                    error_detail = error_json["error"]
            except Exception:
                pass
            raise APIError(response.status_code, error_detail)

        return response.json()

    def _request_v2(
        self,
        method: str,
        path: str,
        params: Optional[dict[str, Any]] = None,
        json_data: Optional[dict[str, Any]] = None,
        retry_on_401: bool = True,
    ) -> dict[str, Any]:
        """Make an authenticated request to the v2 API."""
        headers = self._get_headers()

        # Use v2 base URL directly
        url = BASE_URL_V2 + path

        response = httpx.request(
            method=method,
            url=url,
            params=params,
            json=json_data,
            headers=headers,
            timeout=30.0,
        )

        # Handle 401 by refreshing token and retrying once
        if response.status_code == 401 and retry_on_401:
            clear_token()
            headers = self._get_headers()
            response = httpx.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                headers=headers,
                timeout=30.0,
            )

        if response.status_code >= 400:
            error_detail = response.text
            try:
                error_json = response.json()
                if "reason" in error_json:
                    error_detail = error_json["reason"]
                elif "error" in error_json:
                    error_detail = error_json["error"]
            except Exception:
                pass
            raise APIError(response.status_code, error_detail)

        return response.json()

    def get(self, path: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Make a GET request."""
        return self._request("GET", path, params=params)

    def post(
        self, path: str, json_data: Optional[dict[str, Any]] = None, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Make a POST request."""
        return self._request("POST", path, params=params, json_data=json_data)

    def post_v2(
        self, path: str, json_data: Optional[dict[str, Any]] = None, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Make a POST request to v2 API."""
        return self._request_v2("POST", path, params=params, json_data=json_data)

    def put(
        self, path: str, json_data: Optional[dict[str, Any]] = None, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Make a PUT request."""
        return self._request("PUT", path, params=params, json_data=json_data)

    def delete(self, path: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Make a DELETE request."""
        return self._request("DELETE", path, params=params)

    def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            self._client.close()
            self._client = None

    def __enter__(self) -> "SharesightClient":
        return self

    def __exit__(self, *args) -> None:
        self.close()


class APIError(Exception):
    """API error with status code and message."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"API Error {status_code}: {message}")
