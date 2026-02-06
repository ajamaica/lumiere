"""
Moltpho OpenClaw Skill - Core API Client Library

This module provides the catalog search and purchase functions for the
Moltpho OpenClaw skill, implementing the flows described in SPEC.md.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import stat
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlencode

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# =============================================================================
# Constants (from SPEC Section 16.1)
# =============================================================================

API_BASE_URL = "https://api.moltpho.com"
MAX_QUOTE_RETRIES = 3
QUOTE_RETRY_PRICE_TOLERANCE_BPS = 500  # 5%
QUOTE_TTL_SECONDS = 600  # 10 minutes (hardcoded per SPEC)
DEFAULT_REQUEST_TIMEOUT = 30  # seconds


# =============================================================================
# Error Codes (from SPEC Section 13.3)
# =============================================================================


class MoltphoErrorCode(str, Enum):
    """API error codes from SPEC Section 13.3."""

    BAD_REQUEST = "BAD_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED"
    FORBIDDEN_SCOPE = "FORBIDDEN_SCOPE"
    NOT_FOUND = "NOT_FOUND"
    PRICE_CHANGED = "PRICE_CHANGED"
    INSUFFICIENT_CREDIT = "INSUFFICIENT_CREDIT"
    QUOTE_EXPIRED = "QUOTE_EXPIRED"
    QUOTE_RETRY_LIMIT_EXCEEDED = "QUOTE_RETRY_LIMIT_EXCEEDED"
    MAX_CONCURRENT_QUOTES = "MAX_CONCURRENT_QUOTES"
    INVALID_SHIPPING_PROFILE = "INVALID_SHIPPING_PROFILE"
    AGENT_SUSPENDED = "AGENT_SUSPENDED"
    AGENT_DEGRADED = "AGENT_DEGRADED"
    RATE_LIMITED = "RATE_LIMITED"
    PROCUREMENT_UNAVAILABLE = "PROCUREMENT_UNAVAILABLE"
    KEY_SERVICE_UNAVAILABLE = "KEY_SERVICE_UNAVAILABLE"
    TOKEN_PAUSED = "TOKEN_PAUSED"
    FACILITATOR_UNAVAILABLE = "FACILITATOR_UNAVAILABLE"


class MoltphoError(Exception):
    """Base exception for Moltpho API errors."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 0,
        retry_after: Optional[int] = None,
        details: Optional[dict] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retry_after = retry_after
        self.details = details or {}

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"


class PaymentRequiredError(MoltphoError):
    """402 Payment Required - need x402 signature."""

    def __init__(self, payment_required: dict, message: str = "Payment required"):
        super().__init__(
            code=MoltphoErrorCode.PAYMENT_REQUIRED,
            message=message,
            status_code=402,
            details={"payment_required": payment_required},
        )
        self.payment_required = payment_required


class RateLimitedError(MoltphoError):
    """429 Rate Limited - includes Retry-After."""

    def __init__(self, retry_after: int, message: str = "Rate limited"):
        super().__init__(
            code=MoltphoErrorCode.RATE_LIMITED,
            message=message,
            status_code=429,
            retry_after=retry_after,
        )


# =============================================================================
# Data Classes
# =============================================================================


@dataclass
class Credentials:
    """Agent credentials from credentials.json (Appendix A)."""

    agent_id: str
    api_key_id: str
    api_key_secret: str
    api_base_url: str
    wallet_address: str

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "api_key_id": self.api_key_id,
            "api_key_secret": self.api_key_secret,
            "api_base_url": self.api_base_url,
            "wallet_address": self.wallet_address,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Credentials:
        return cls(
            agent_id=data["agent_id"],
            api_key_id=data["api_key_id"],
            api_key_secret=data["api_key_secret"],
            api_base_url=data.get("api_base_url", API_BASE_URL),
            wallet_address=data["wallet_address"],
        )


@dataclass
class CatalogItem:
    """Catalog item from search or item detail."""

    asin: str
    title: str
    brand: Optional[str]
    images: list[str]
    offer_price_cents: int
    currency: str
    stock_status: str
    bullet_points: list[str]
    soft_expired: bool = False
    prices_may_have_changed: bool = False

    @classmethod
    def from_api(cls, data: dict) -> CatalogItem:
        return cls(
            asin=data["asin"],
            title=data["title"],
            brand=data.get("brand"),
            images=data.get("images", []),
            offer_price_cents=data.get("offerPriceCents", 0),
            currency=data.get("currency", "USD"),
            stock_status=data.get("stockStatus", "UNKNOWN"),
            bullet_points=data.get("bulletPoints", []),
            soft_expired=data.get("softExpired", False),
            prices_may_have_changed=data.get("pricesMayHaveChanged", False),
        )


@dataclass
class Quote:
    """Quote response from POST /v1/quotes."""

    quote_id: str
    soft_reservation_id: Optional[str]
    asin: str
    quantity: int
    amazon_offer_price_cents: int
    markup_bps: int
    moltpho_price_cents: int
    tax_cents_est: Optional[int]
    shipping_cents_est: Optional[int]
    total_cents: int
    stock_status: str
    expires_at: datetime
    shipping_profile_id: Optional[str]

    @classmethod
    def from_api(cls, data: dict) -> Quote:
        expires_at_raw = data.get("expiresAt", "")
        return cls(
            quote_id=data.get("id", ""),
            soft_reservation_id=data.get("softReservationId"),
            asin=data["asin"],
            quantity=data["quantity"],
            amazon_offer_price_cents=data.get("amazonOfferPriceCents", 0),
            markup_bps=data.get("markupBps", 0),
            moltpho_price_cents=data.get("moltphoPriceCents", 0),
            tax_cents_est=data.get("taxCentsEst"),
            shipping_cents_est=data.get("shippingCentsEst"),
            total_cents=data.get("totalCents", 0),
            stock_status=data.get("stockStatus", "UNKNOWN"),
            expires_at=datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00")),
            shipping_profile_id=data.get("shippingProfileId"),
        )

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at


@dataclass
class Order:
    """Order response from POST /v1/orders."""

    order_id: str
    status: str
    total_cents: int
    quote_id: str
    amazon_order_ref: Optional[str]
    tracking_ref: Optional[str]
    cancellation_window_ends_at: Optional[datetime]
    created_at: datetime

    @classmethod
    def from_api(cls, data: dict) -> Order:
        cancel_raw = data.get("cancellationWindowEndsAt")
        cancel_window = None
        if cancel_raw:
            cancel_window = datetime.fromisoformat(
                cancel_raw.replace("Z", "+00:00")
            )
        created_raw = data.get("createdAt", "")
        return cls(
            order_id=data.get("id", ""),
            status=data["status"],
            total_cents=data.get("totalCents", 0),
            quote_id=data.get("quoteId", ""),
            amazon_order_ref=data.get("amazonOrderRef"),
            tracking_ref=data.get("trackingRef"),
            cancellation_window_ends_at=cancel_window,
            created_at=datetime.fromisoformat(
                created_raw.replace("Z", "+00:00")
            ),
        )


@dataclass
class Balance:
    """Balance response from GET /v1/balance."""

    available_credit_cents: int
    staged_refund_cents: int
    total_spent_week_cents: int
    total_spent_month_cents: int
    display: str

    @classmethod
    def from_api(cls, data: dict) -> Balance:
        return cls(
            available_credit_cents=data["available_credit_cents"],
            staged_refund_cents=data.get("staged_refund_cents", 0),
            total_spent_week_cents=data.get("total_spent_week_cents", 0),
            total_spent_month_cents=data.get("total_spent_month_cents", 0),
            display=data.get("display", ""),
        )


@dataclass
class CreditPolicy:
    """Credit policy from GET /v1/credit_policy."""

    target_limit_cents: int
    per_order_cap_cents: Optional[int]
    daily_cap_cents: Optional[int]
    autonomous_purchasing_enabled: bool
    proactive_purchasing_enabled: bool
    confirmation_required: bool

    @classmethod
    def from_api(cls, data: dict) -> CreditPolicy:
        return cls(
            target_limit_cents=data["target_limit_cents"],
            per_order_cap_cents=data.get("per_order_cap_cents"),
            daily_cap_cents=data.get("daily_cap_cents"),
            autonomous_purchasing_enabled=data.get(
                "autonomous_purchasing_enabled", True
            ),
            proactive_purchasing_enabled=data.get(
                "proactive_purchasing_enabled", True
            ),
            confirmation_required=data.get("confirmation_required", False),
        )


@dataclass
class SupportTicket:
    """Support ticket from POST/GET /v1/support_tickets."""

    id: str
    type: str  # RETURN, LOST_PACKAGE, OTHER
    status: str  # OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
    order_id: Optional[str]
    created_at: str
    updated_at: Optional[str]

    @classmethod
    def from_api(cls, data: dict) -> SupportTicket:
        return cls(
            id=data["id"],
            type=data["type"],
            status=data["status"],
            order_id=data.get("order_id"),
            created_at=data["created_at"],
            updated_at=data.get("updated_at"),
        )


@dataclass
class ShippingProfile:
    """Shipping profile from GET /v1/shipping_profiles."""

    id: str
    full_name: str
    address1: str
    address2: Optional[str]
    city: str
    state: str
    postal_code: str
    country: str
    email: str
    phone: str
    is_default: bool

    @classmethod
    def from_api(cls, data: dict) -> ShippingProfile:
        return cls(
            id=data["id"],
            full_name=data["full_name"],
            address1=data["address1"],
            address2=data.get("address2"),
            city=data["city"],
            state=data["state"],
            postal_code=data["postal_code"],
            country=data["country"],
            email=data["email"],
            phone=data["phone"],
            is_default=data.get("is_default", False),
        )


# =============================================================================
# Credentials Management (SPEC Section 5.1, 5.2)
# =============================================================================


def get_credentials_path() -> Path:
    """
    Get the credentials file path based on platform and environment.

    Order of precedence:
    1. MOLTPHO_CREDENTIALS_PATH environment variable
    2. Platform-specific default:
       - Linux/macOS: ~/.config/moltpho/credentials.json
       - Windows: %APPDATA%/moltpho/credentials.json
    """
    if env_path := os.environ.get("MOLTPHO_CREDENTIALS_PATH"):
        return Path(env_path)
    if platform.system() == "Windows":
        return Path(os.environ["APPDATA"]) / "moltpho" / "credentials.json"
    return Path.home() / ".config" / "moltpho" / "credentials.json"


def load_credentials() -> Optional[Credentials]:
    """
    Load and validate credentials from the credentials file.

    Returns:
        Credentials object if file exists and is valid, None otherwise.

    Raises:
        MoltphoError: If credentials file exists but is invalid or unreadable.
    """
    path = get_credentials_path()
    if not path.exists():
        return None

    try:
        with open(path, "r") as f:
            data = json.load(f)

        # Validate required fields
        required = ["agent_id", "api_key_id", "api_key_secret", "wallet_address"]
        missing = [k for k in required if not data.get(k)]
        if missing:
            raise MoltphoError(
                code="INVALID_CREDENTIALS",
                message=f"Credentials file missing required fields: {missing}",
            )

        return Credentials.from_dict(data)

    except json.JSONDecodeError as e:
        raise MoltphoError(
            code="INVALID_CREDENTIALS",
            message=f"Credentials file is not valid JSON: {e}",
        )
    except PermissionError:
        raise MoltphoError(
            code="CREDENTIALS_ACCESS_DENIED",
            message=f"Cannot read credentials file at {path}",
        )


def save_credentials(creds: Credentials) -> None:
    """
    Save credentials to file with chmod 600 permissions.

    Per SPEC Section 5.1, credentials file should have 600 permissions
    to prevent unauthorized access.

    Args:
        creds: Credentials object to save.

    Raises:
        MoltphoError: If unable to save credentials.
    """
    path = get_credentials_path()

    try:
        # Ensure parent directory exists
        path.parent.mkdir(parents=True, exist_ok=True)

        # Write credentials
        with open(path, "w") as f:
            json.dump(creds.to_dict(), f, indent=2)

        # Set permissions to 600 (owner read/write only)
        # On Windows, this is a no-op but doesn't fail
        if platform.system() != "Windows":
            os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)

    except (OSError, PermissionError) as e:
        raise MoltphoError(
            code="CREDENTIALS_SAVE_FAILED",
            message=f"Failed to save credentials to {path}: {e}",
        )


def delete_credentials() -> bool:
    """
    Delete local credentials file (logout).

    Per SPEC Section 15.3, this only deletes local credentials.
    The agent still exists server-side.

    Returns:
        True if file was deleted, False if it didn't exist.
    """
    path = get_credentials_path()
    if path.exists():
        path.unlink()
        return True
    return False


# =============================================================================
# HTTP Client
# =============================================================================


def _create_session() -> requests.Session:
    """Create a requests session with retry configuration."""
    session = requests.Session()

    # Configure retries for transient failures
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[502, 503, 504],
        allowed_methods=["GET", "POST", "DELETE", "PATCH"],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    return session


def _get_auth_headers(creds: Credentials) -> dict:
    """
    Get authentication headers for API requests.

    Per SPEC Section 13.1:
    - Authorization: Bearer <api_key_secret>
    - X-Moltpho-Key-Id: <api_key_id>
    """
    return {
        "Authorization": f"Bearer {creds.api_key_secret}",
        "X-Moltpho-Key-Id": creds.api_key_id,
        "Content-Type": "application/json",
    }


def _handle_error_response(response: requests.Response) -> None:
    """
    Handle error responses from the API.

    Raises appropriate MoltphoError based on status code and error body.
    """
    try:
        error_data = response.json()
        error_code = error_data.get("error", "UNKNOWN_ERROR")
        message = error_data.get("message", response.reason)
        retry_after = error_data.get("retry_after_seconds")
    except (json.JSONDecodeError, ValueError):
        error_code = "UNKNOWN_ERROR"
        message = response.text or response.reason
        retry_after = None

    # Handle 402 Payment Required specially
    if response.status_code == 402:
        payment_required = response.headers.get("PAYMENT-REQUIRED")
        if payment_required:
            try:
                payment_data = json.loads(payment_required)
            except json.JSONDecodeError:
                payment_data = {"raw": payment_required}
        else:
            payment_data = error_data.get("payment_required", {})
        raise PaymentRequiredError(payment_required=payment_data, message=message)

    # Handle 429 Rate Limited specially
    if response.status_code == 429:
        retry_after = retry_after or int(response.headers.get("Retry-After", 60))
        raise RateLimitedError(retry_after=retry_after, message=message)

    raise MoltphoError(
        code=error_code,
        message=message,
        status_code=response.status_code,
        retry_after=retry_after,
        details=error_data if isinstance(error_data, dict) else {},
    )


def _api_request(
    method: str,
    endpoint: str,
    creds: Optional[Credentials] = None,
    params: Optional[dict] = None,
    data: Optional[dict] = None,
    headers: Optional[dict] = None,
    timeout: int = DEFAULT_REQUEST_TIMEOUT,
) -> dict:
    """
    Make an API request to the Moltpho backend.

    Args:
        method: HTTP method (GET, POST, etc.)
        endpoint: API endpoint path (e.g., "/v1/balance")
        creds: Credentials for authentication (optional for registration)
        params: Query parameters
        data: Request body (will be JSON-encoded)
        headers: Additional headers
        timeout: Request timeout in seconds

    Returns:
        Response JSON as dict

    Raises:
        MoltphoError: On API errors
        PaymentRequiredError: On 402 responses
        RateLimitedError: On 429 responses
    """
    base_url = creds.api_base_url if creds else API_BASE_URL
    url = f"{base_url}{endpoint}"

    request_headers = {"Content-Type": "application/json"}
    if creds:
        request_headers.update(_get_auth_headers(creds))
    if headers:
        request_headers.update(headers)

    session = _create_session()

    response = session.request(
        method=method,
        url=url,
        params=params,
        json=data,
        headers=request_headers,
        timeout=timeout,
    )

    if not response.ok:
        _handle_error_response(response)

    # Return empty dict for 204 No Content
    if response.status_code == 204:
        return {}

    return response.json()


# =============================================================================
# Agent Registration (SPEC Section 5.1)
# =============================================================================


def register_agent(
    display_name: str,
    description: str,
    openclaw_instance_id: Optional[str] = None,
) -> Credentials:
    """
    Register a new agent account.

    Per SPEC Section 5.1:
    - Called on first skill invocation when credentials missing
    - Creates agent, API keypair, and custodial wallet
    - Returns credentials including one-time claim URL

    Args:
        display_name: Human-readable name for the agent
        description: Description of the agent's purpose
        openclaw_instance_id: Optional OpenClaw instance identifier

    Returns:
        Credentials object (also saves to file)

    Raises:
        MoltphoError: On registration failure
    """
    payload = {
        "agent_display_name": display_name,
        "agent_description": description,
    }
    if openclaw_instance_id:
        payload["openclaw_instance_id"] = openclaw_instance_id

    response = _api_request(
        method="POST",
        endpoint="/v1/agents/register",
        data=payload,
    )

    creds = Credentials(
        agent_id=response["agent_id"],
        api_key_id=response["api_key_id"],
        api_key_secret=response["api_key_secret"],
        api_base_url=API_BASE_URL,
        wallet_address=response["wallet_address"],
    )

    # Save credentials with proper permissions
    save_credentials(creds)

    return creds


# =============================================================================
# Catalog Search (SPEC Section 6.4, 12.1)
# =============================================================================


def catalog_search(
    query: str,
    creds: Optional[Credentials] = None,
    max_price_cents: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
) -> list[CatalogItem]:
    """
    Search the product catalog.

    Per SPEC Section 6.4 (FR-21 to FR-26):
    - Returns items with Moltpho price (includes markup, not shown separately)
    - Filters items above MAX_SALE_USD
    - Soft-expired cache entries shown with warning

    Args:
        query: Search query string
        creds: Agent credentials (uses default if None)
        max_price_cents: Optional maximum price filter in cents
        category: Optional category filter (keyword-based)
        limit: Maximum results to return (default 10, max 50)
        offset: Pagination offset

    Returns:
        List of CatalogItem objects

    Raises:
        MoltphoError: On API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    params = {
        "query": query,
        "limit": min(limit, 50),
        "offset": offset,
    }
    if max_price_cents is not None:
        params["maxPrice"] = max_price_cents
    if category:
        params["category"] = category

    response = _api_request(
        method="GET",
        endpoint="/v1/catalog/search",
        creds=creds,
        params=params,
    )

    return [CatalogItem.from_api(item) for item in response.get("items", [])]


def get_item(asin: str, creds: Optional[Credentials] = None) -> CatalogItem:
    """
    Get detailed information about a specific item.

    Args:
        asin: Amazon Standard Identification Number
        creds: Agent credentials

    Returns:
        CatalogItem with full details

    Raises:
        MoltphoError: On API errors or item not found
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    response = _api_request(
        method="GET",
        endpoint=f"/v1/catalog/items/{asin}",
        creds=creds,
    )

    return CatalogItem.from_api(response)


# =============================================================================
# Quoting (SPEC Section 5.4)
# =============================================================================


def create_quote(
    asin: str,
    quantity: int,
    shipping_profile_id: str,
    creds: Optional[Credentials] = None,
    idempotency_key: Optional[str] = None,
) -> Quote:
    """
    Create a quote for a purchase.

    Per SPEC Section 5.4:
    - Validates shipping profile exists and is valid US address
    - Creates soft reservation for quote amount
    - Returns quote with fixed 10-minute TTL
    - Includes x402 payment_requirements for order creation

    Args:
        asin: Amazon Standard Identification Number
        quantity: Number of items
        shipping_profile_id: Shipping profile to use
        creds: Agent credentials
        idempotency_key: Optional idempotency key (auto-generated if not provided)

    Returns:
        Quote object with pricing and payment requirements

    Raises:
        MoltphoError: On validation failures or API errors
        422 INVALID_SHIPPING_PROFILE: If shipping profile is missing or invalid
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    if idempotency_key is None:
        idempotency_key = str(uuid.uuid4())

    payload = {
        "asin": asin,
        "quantity": quantity,
        "shippingProfileId": shipping_profile_id,
    }

    headers = {"Idempotency-Key": idempotency_key}

    response = _api_request(
        method="POST",
        endpoint="/v1/quotes",
        creds=creds,
        data=payload,
        headers=headers,
    )

    return Quote.from_api(response)


def cancel_quote(quote_id: str, creds: Optional[Credentials] = None) -> None:
    """
    Cancel a quote and release its soft reservation.

    Args:
        quote_id: Quote to cancel
        creds: Agent credentials

    Raises:
        MoltphoError: On API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    _api_request(
        method="DELETE",
        endpoint=f"/v1/quotes/{quote_id}",
        creds=creds,
    )


# =============================================================================
# Balance and Credit (SPEC Section 8.3)
# =============================================================================


def get_balance(creds: Optional[Credentials] = None) -> Balance:
    """
    Get current account balance.

    Per SPEC Section 8.3:
    - available_credit = unspent mUSD - active soft reservations + staged refunds
    - Staged refunds shown with asterisk notation

    Args:
        creds: Agent credentials

    Returns:
        Balance object with available credit and spending totals

    Raises:
        MoltphoError: On API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    response = _api_request(
        method="GET",
        endpoint="/v1/balance",
        creds=creds,
    )

    return Balance.from_api(response)


def get_credit_policy(creds: Optional[Credentials] = None) -> CreditPolicy:
    """
    Get the credit policy for the agent.

    Args:
        creds: Agent credentials

    Returns:
        CreditPolicy object with limits and purchasing settings

    Raises:
        MoltphoError: On API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    response = _api_request(
        method="GET",
        endpoint="/v1/credit_policy",
        creds=creds,
    )

    return CreditPolicy.from_api(response)


def budget_check(amount_cents: int, creds: Optional[Credentials] = None) -> dict:
    """
    Check if a purchase amount is within budget limits.

    Per SPEC Section 11.2:
    - Checks against available credit
    - Checks against per-order cap (if set)
    - Checks against daily cap (if set)

    Args:
        amount_cents: Purchase amount to check in cents
        creds: Agent credentials

    Returns:
        Dict with:
        - allowed: bool indicating if purchase is allowed
        - available_credit_cents: current available credit
        - reasons: list of reasons if not allowed
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    balance = get_balance(creds)
    policy = get_credit_policy(creds)

    reasons = []
    allowed = True

    # Check available credit
    if amount_cents > balance.available_credit_cents:
        allowed = False
        reasons.append(
            f"Insufficient credit: ${amount_cents/100:.2f} requested, "
            f"${balance.available_credit_cents/100:.2f} available"
        )

    # Check per-order cap
    if policy.per_order_cap_cents and amount_cents > policy.per_order_cap_cents:
        allowed = False
        reasons.append(
            f"Exceeds per-order cap: ${amount_cents/100:.2f} requested, "
            f"${policy.per_order_cap_cents/100:.2f} cap"
        )

    # Check daily cap
    if policy.daily_cap_cents:
        # Would need to sum today's orders + this amount
        # For now, just check if there's headroom
        today_spent = balance.total_spent_week_cents // 7  # Rough approximation
        if today_spent + amount_cents > policy.daily_cap_cents:
            allowed = False
            reasons.append(
                f"Would exceed daily cap: ${policy.daily_cap_cents/100:.2f}"
            )

    return {
        "allowed": allowed,
        "available_credit_cents": balance.available_credit_cents,
        "reasons": reasons,
    }


# =============================================================================
# x402 Payment Signing (SPEC Section 10.3)
# =============================================================================


def request_x402_signature(
    quote_id: str,
    payment_required: dict,
    idempotency_key: str,
    creds: Optional[Credentials] = None,
) -> str:
    """
    Request x402 payment signature from the wallet service.

    Per SPEC Section 10.3:
    - Custodial wallet service signs EIP-3009 authorization
    - Enforces payTo == MoltphoMall
    - Enforces amount == expected quote total
    - Sets validBefore to min(quote.expires_at, 10 min from signing)
    - Rate limited: max 10 signs/min per agent

    Args:
        quote_id: Quote ID for the order
        payment_required: PAYMENT-REQUIRED blob from 402 response
        idempotency_key: Order idempotency key
        creds: Agent credentials

    Returns:
        Payment signature string for PAYMENT-SIGNATURE header

    Raises:
        MoltphoError: On API errors or rate limiting
        RateLimitedError: If rate limit exceeded (10/min)
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    payload = {
        "quoteId": quote_id,
        "paymentRequired": payment_required,
    }

    headers = {"Idempotency-Key": idempotency_key}

    response = _api_request(
        method="POST",
        endpoint="/v1/wallets/x402/sign",
        creds=creds,
        data=payload,
        headers=headers,
    )

    return response["paymentSignature"]


# =============================================================================
# Order Creation (SPEC Section 5.4)
# =============================================================================


def _create_order_with_signature(
    quote_id: str,
    shipping_profile_id: str,
    idempotency_key: str,
    payment_signature: str,
    creds: Credentials,
) -> Order:
    """Create order with payment signature."""
    payload = {
        "quoteId": quote_id,
    }

    headers = {
        "Idempotency-Key": idempotency_key,
        "PAYMENT-SIGNATURE": payment_signature,
    }

    response = _api_request(
        method="POST",
        endpoint="/v1/orders",
        creds=creds,
        data=payload,
        headers=headers,
    )

    return Order.from_api(response)


def create_order(
    quote_id: str,
    shipping_profile_id: str,
    idempotency_key: str,
    creds: Optional[Credentials] = None,
) -> Order:
    """
    Create an order with x402 payment flow.

    Per SPEC Section 5.4:
    1. Attempt POST /orders - get 402 response
    2. Request x402 signature from wallet service
    3. Retry POST /orders with PAYMENT-SIGNATURE header

    Args:
        quote_id: Quote ID from create_quote
        shipping_profile_id: Shipping profile to use
        idempotency_key: Idempotency key for the order
        creds: Agent credentials

    Returns:
        Order object with status and details

    Raises:
        MoltphoError: On various API errors
        409 PRICE_CHANGED: If price increased >2% since quote
        409 INSUFFICIENT_CREDIT: If not enough balance
        409 QUOTE_EXPIRED: If quote TTL exceeded
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    payload = {
        "quoteId": quote_id,
    }

    headers = {"Idempotency-Key": idempotency_key}

    try:
        # First attempt - expect 402 Payment Required
        response = _api_request(
            method="POST",
            endpoint="/v1/orders",
            creds=creds,
            data=payload,
            headers=headers,
        )
        # If we get here without 402, order was already created (idempotency)
        return Order.from_api(response)

    except PaymentRequiredError as e:
        # Get x402 signature
        payment_signature = request_x402_signature(
            quote_id=quote_id,
            payment_required=e.payment_required,
            idempotency_key=idempotency_key,
            creds=creds,
        )

        # Retry with signature
        return _create_order_with_signature(
            quote_id=quote_id,
            shipping_profile_id=shipping_profile_id,
            idempotency_key=idempotency_key,
            payment_signature=payment_signature,
            creds=creds,
        )


def get_order(order_id: str, creds: Optional[Credentials] = None) -> Order:
    """
    Get order details.

    Args:
        order_id: Order ID
        creds: Agent credentials

    Returns:
        Order object with current status

    Raises:
        MoltphoError: On API errors or order not found
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    response = _api_request(
        method="GET",
        endpoint=f"/v1/orders/{order_id}",
        creds=creds,
    )

    return Order.from_api(response)


# =============================================================================
# Shipping Profiles (SPEC Section 6.2)
# =============================================================================


def get_shipping_profiles(
    creds: Optional[Credentials] = None,
) -> list[ShippingProfile]:
    """
    Get all shipping profiles for the agent.

    Args:
        creds: Agent credentials

    Returns:
        List of ShippingProfile objects

    Raises:
        MoltphoError: On API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    response = _api_request(
        method="GET",
        endpoint="/v1/shipping_profiles",
        creds=creds,
    )

    return [ShippingProfile.from_api(p) for p in response.get("profiles", [])]


def get_default_shipping_profile(
    creds: Optional[Credentials] = None,
) -> Optional[ShippingProfile]:
    """
    Get the default shipping profile.

    Args:
        creds: Agent credentials

    Returns:
        Default ShippingProfile or None if not set

    Raises:
        MoltphoError: On API errors
    """
    profiles = get_shipping_profiles(creds)
    for profile in profiles:
        if profile.is_default:
            return profile
    # Return first profile if no default set
    return profiles[0] if profiles else None


def upsert_shipping_profile(
    full_name: str,
    address1: str,
    city: str,
    state: str,
    postal_code: str,
    email: str,
    phone: str,
    address2: Optional[str] = None,
    country: str = "US",
    creds: Optional[Credentials] = None,
) -> ShippingProfile:
    """
    Create or update the default shipping profile for the agent.

    Per SPEC Section 6.2:
    - Only US addresses are supported in v1
    - POST upserts the default profile (creates if none, updates if exists)

    Args:
        full_name: Recipient full name
        address1: Street address line 1
        city: City
        state: State (2-letter code, e.g. "CA")
        postal_code: ZIP code
        email: Contact email
        phone: Contact phone number
        address2: Optional street address line 2
        country: Country code (default "US", only US supported)
        creds: Agent credentials

    Returns:
        ShippingProfile object

    Raises:
        MoltphoError: On validation failures or API errors
        422 INVALID_SHIPPING_PROFILE: If non-US address
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    payload: dict[str, Any] = {
        "full_name": full_name,
        "address1": address1,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "country": country,
        "email": email,
        "phone": phone,
    }
    if address2:
        payload["address2"] = address2

    response = _api_request(
        method="POST",
        endpoint="/v1/shipping_profiles",
        creds=creds,
        data=payload,
    )

    return ShippingProfile.from_api(response.get("shipping_profile", response))


# =============================================================================
# Complete Purchase Flow (SPEC Section 5.4)
# =============================================================================


def purchase(
    asin: str,
    quantity: int,
    shipping_profile_id: Optional[str] = None,
    creds: Optional[Credentials] = None,
) -> Order:
    """
    Complete purchase flow with x402 payment.

    Per SPEC Section 5.4:
    1. Create quote (soft reservation created)
    2. Attempt POST /orders - get 402 response
    3. Request x402 signature from wallet service
    4. Retry POST /orders with PAYMENT-SIGNATURE header
    5. Return order status

    Auto-retry up to 3x on quote expiry (within 5% price tolerance).

    Args:
        asin: Amazon Standard Identification Number
        quantity: Number of items to purchase
        shipping_profile_id: Shipping profile to use (uses default if None)
        creds: Agent credentials

    Returns:
        Order object with status and details

    Raises:
        MoltphoError: On various API errors
        409 PRICE_CHANGED: If price increased >5% during retries
        409 INSUFFICIENT_CREDIT: If not enough balance
        409 QUOTE_RETRY_LIMIT_EXCEEDED: After 3 failed retries
        422 INVALID_SHIPPING_PROFILE: If no shipping profile set
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    # Get shipping profile if not provided
    if shipping_profile_id is None:
        default_profile = get_default_shipping_profile(creds)
        if default_profile is None:
            raise MoltphoError(
                code=MoltphoErrorCode.INVALID_SHIPPING_PROFILE,
                message="No shipping profile set. Please add a shipping address.",
                status_code=422,
            )
        shipping_profile_id = default_profile.id

    # Generate idempotency key for the entire purchase flow
    purchase_idempotency_key = str(uuid.uuid4())
    original_price_cents: Optional[int] = None

    for attempt in range(MAX_QUOTE_RETRIES):
        # Create quote
        quote_idempotency_key = f"{purchase_idempotency_key}-quote-{attempt}"
        try:
            quote = create_quote(
                asin=asin,
                quantity=quantity,
                shipping_profile_id=shipping_profile_id,
                creds=creds,
                idempotency_key=quote_idempotency_key,
            )
        except MoltphoError:
            raise

        # Track original price for tolerance checking
        if original_price_cents is None:
            original_price_cents = quote.total_cents
        else:
            # Check price tolerance (5% per SPEC)
            price_change_bps = abs(
                (quote.total_cents - original_price_cents)
                * 10000
                // original_price_cents
            )
            if price_change_bps > QUOTE_RETRY_PRICE_TOLERANCE_BPS:
                raise MoltphoError(
                    code=MoltphoErrorCode.PRICE_CHANGED,
                    message=(
                        f"Price changed beyond tolerance: "
                        f"${original_price_cents/100:.2f} -> ${quote.total_cents/100:.2f}"
                    ),
                    status_code=409,
                )

        # Attempt to create order
        order_idempotency_key = f"{purchase_idempotency_key}-order-{attempt}"
        try:
            order = create_order(
                quote_id=quote.quote_id,
                shipping_profile_id=shipping_profile_id,
                idempotency_key=order_idempotency_key,
                creds=creds,
            )
            return order

        except MoltphoError as e:
            # If quote expired, retry with fresh quote
            if e.code == MoltphoErrorCode.QUOTE_EXPIRED:
                if attempt < MAX_QUOTE_RETRIES - 1:
                    continue
                raise MoltphoError(
                    code=MoltphoErrorCode.QUOTE_RETRY_LIMIT_EXCEEDED,
                    message=f"Quote expired after {MAX_QUOTE_RETRIES} retry attempts",
                    status_code=409,
                )
            raise

    # Should not reach here, but handle edge case
    raise MoltphoError(
        code=MoltphoErrorCode.QUOTE_RETRY_LIMIT_EXCEEDED,
        message=f"Failed after {MAX_QUOTE_RETRIES} attempts",
        status_code=409,
    )


# =============================================================================
# Support Tickets (SPEC Section 16.3)
# =============================================================================


def create_support_ticket(
    ticket_type: str,
    description: str,
    order_id: Optional[str] = None,
    creds: Optional[Credentials] = None,
) -> SupportTicket:
    """
    Create a new support ticket.

    Args:
        ticket_type: Ticket type - "RETURN", "LOST_PACKAGE", or "OTHER"
        description: Detailed description of the issue (1-2000 chars)
        order_id: Order ID (required for RETURN and LOST_PACKAGE)
        creds: Agent credentials

    Returns:
        SupportTicket object with id, type, status, and created_at

    Raises:
        MoltphoError: On validation failures or API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    if ticket_type in ("RETURN", "LOST_PACKAGE") and not order_id:
        raise MoltphoError(
            code=MoltphoErrorCode.BAD_REQUEST,
            message=f"order_id is required for {ticket_type} ticket type",
            status_code=400,
        )

    payload: dict[str, Any] = {
        "type": ticket_type,
        "description": description,
    }
    if order_id:
        payload["order_id"] = order_id

    response = _api_request(
        method="POST",
        endpoint="/v1/support_tickets",
        creds=creds,
        data=payload,
    )

    return SupportTicket.from_api(response)


def list_support_tickets(
    limit: int = 50,
    offset: int = 0,
    creds: Optional[Credentials] = None,
) -> list[SupportTicket]:
    """
    List support tickets for the authenticated agent.

    Args:
        limit: Maximum number of tickets to return (default 50, max 100)
        offset: Pagination offset
        creds: Agent credentials

    Returns:
        List of SupportTicket objects

    Raises:
        MoltphoError: On API errors
    """
    if creds is None:
        creds = load_credentials()
        if creds is None:
            raise MoltphoError(
                code="NOT_AUTHENTICATED",
                message="No credentials found. Please register first.",
            )

    params = {
        "limit": min(limit, 100),
        "offset": offset,
    }

    response = _api_request(
        method="GET",
        endpoint="/v1/support_tickets",
        creds=creds,
        params=params,
    )

    return [SupportTicket.from_api(t) for t in response.get("tickets", [])]


# =============================================================================
# Utility Functions
# =============================================================================


def format_price(cents: int, currency: str = "USD") -> str:
    """Format price in cents to human-readable string."""
    if currency == "USD":
        return f"${cents / 100:.2f}"
    return f"{cents / 100:.2f} {currency}"


def generate_idempotency_key() -> str:
    """Generate a unique idempotency key."""
    return str(uuid.uuid4())
