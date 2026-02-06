"""Authentication for PocketSmith API using Developer Key."""

import os


def get_developer_key() -> str:
    """Get the PocketSmith developer key from environment.

    Returns:
        The developer key string.

    Raises:
        ValueError: If POCKETSMITH_DEVELOPER_KEY is not set.
    """
    key = os.environ.get("POCKETSMITH_DEVELOPER_KEY")
    if not key:
        raise ValueError(
            "POCKETSMITH_DEVELOPER_KEY environment variable is required. "
            "Get your key from PocketSmith Settings > Security > Manage Developer Keys."
        )
    return key


def is_authenticated() -> bool:
    """Check if a developer key is available.

    Returns:
        True if POCKETSMITH_DEVELOPER_KEY is set, False otherwise.
    """
    return bool(os.environ.get("POCKETSMITH_DEVELOPER_KEY"))
