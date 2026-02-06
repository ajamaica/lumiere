"""Base model configuration for all Garmin data models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class GarminBaseModel(BaseModel):
    """Base model with common configuration for all Garmin data models."""

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        extra="ignore",
    )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary for serialization."""
        return self.model_dump(mode="json", exclude_none=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "GarminBaseModel":
        """
        Create model instance from raw Garmin API response.
        Override in subclasses for custom parsing logic.
        """
        return cls.model_validate(data)


def parse_garmin_timestamp(timestamp: int | str | None) -> datetime | None:
    """Parse Garmin timestamp (milliseconds since epoch) to datetime."""
    if timestamp is None:
        return None
    if isinstance(timestamp, str):
        try:
            timestamp = int(timestamp)
        except ValueError:
            return None
    # Garmin uses milliseconds
    return datetime.fromtimestamp(timestamp / 1000)


def parse_garmin_date(date_str: str | None) -> datetime | None:
    """Parse Garmin date string (YYYY-MM-DD) to datetime."""
    if date_str is None:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None
