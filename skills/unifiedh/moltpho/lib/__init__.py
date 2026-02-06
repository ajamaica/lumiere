"""
Moltpho OpenClaw Skill Library

Core API client for catalog search, quoting, and purchasing.
"""

from .moltpho import (
    # Constants
    API_BASE_URL,
    MAX_QUOTE_RETRIES,
    QUOTE_RETRY_PRICE_TOLERANCE_BPS,
    QUOTE_TTL_SECONDS,
    # Errors
    MoltphoError,
    MoltphoErrorCode,
    PaymentRequiredError,
    RateLimitedError,
    # Data classes
    Balance,
    CatalogItem,
    Credentials,
    CreditPolicy,
    Order,
    Quote,
    ShippingProfile,
    SupportTicket,
    # Credentials management
    delete_credentials,
    get_credentials_path,
    load_credentials,
    save_credentials,
    # Registration
    register_agent,
    # Catalog
    catalog_search,
    get_item,
    # Quoting
    cancel_quote,
    create_quote,
    # Balance
    budget_check,
    get_balance,
    get_credit_policy,
    # x402 signing
    request_x402_signature,
    # Orders
    create_order,
    get_order,
    # Shipping
    get_default_shipping_profile,
    get_shipping_profiles,
    upsert_shipping_profile,
    # Purchase flow
    purchase,
    # Support tickets
    create_support_ticket,
    list_support_tickets,
    # Utilities
    format_price,
    generate_idempotency_key,
)

__all__ = [
    # Constants
    "API_BASE_URL",
    "MAX_QUOTE_RETRIES",
    "QUOTE_RETRY_PRICE_TOLERANCE_BPS",
    "QUOTE_TTL_SECONDS",
    # Errors
    "MoltphoError",
    "MoltphoErrorCode",
    "PaymentRequiredError",
    "RateLimitedError",
    # Data classes
    "Balance",
    "CatalogItem",
    "Credentials",
    "CreditPolicy",
    "Order",
    "Quote",
    "ShippingProfile",
    "SupportTicket",
    # Credentials management
    "delete_credentials",
    "get_credentials_path",
    "load_credentials",
    "save_credentials",
    # Registration
    "register_agent",
    # Catalog
    "catalog_search",
    "get_item",
    # Quoting
    "cancel_quote",
    "create_quote",
    # Balance
    "budget_check",
    "get_balance",
    "get_credit_policy",
    # x402 signing
    "request_x402_signature",
    # Orders
    "create_order",
    "get_order",
    # Shipping
    "get_default_shipping_profile",
    "get_shipping_profiles",
    "upsert_shipping_profile",
    # Purchase flow
    "purchase",
    # Support tickets
    "create_support_ticket",
    "list_support_tickets",
    # Utilities
    "format_price",
    "generate_idempotency_key",
]

__version__ = "0.1.0"
