"""Hydration data models for tracking water intake."""

from datetime import datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel, parse_garmin_timestamp


class HydrationData(GarminBaseModel):
    """Hydration/water intake data for a specific day."""

    # Date info
    calendar_date: str | None = Field(alias="calendarDate", default=None)

    # Intake metrics (in milliliters)
    total_intake_ml: int = Field(alias="valueInML", default=0)
    goal_ml: int = Field(alias="goalInML", default=2500)

    # Sweat loss (from activities)
    sweat_loss_ml: int = Field(alias="sweatLossInML", default=0)

    # Activity adjustment
    activity_intake_ml: int = Field(alias="activityIntakeInML", default=0)

    # Timestamp of last update
    last_entry_timestamp: datetime | None = Field(
        alias="lastEntryTimestampGMT", default=None
    )

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "HydrationData":
        """Parse hydration data from Garmin API response.

        Handles both the daily endpoint format and the stats endpoint format.
        """

        # Helper to get value from either camelCase or snake_case key
        def get_val(camel: str, snake: str, default: Any = None) -> Any:
            return data.get(camel, data.get(snake, default))

        return cls(
            calendar_date=get_val("calendarDate", "calendar_date"),
            total_intake_ml=int(get_val("valueInML", "value_in_ml", 0)),
            goal_ml=int(get_val("goalInML", "goal_in_ml", 2500)),
            sweat_loss_ml=int(get_val("sweatLossInML", "sweat_loss_in_ml", 0)),
            activity_intake_ml=int(
                get_val("activityIntakeInML", "activity_intake_in_ml", 0)
            ),
            last_entry_timestamp=parse_garmin_timestamp(
                get_val("lastEntryTimestampGMT", "last_entry_timestamp_gmt")
            ),
            raw_data=data,
        )

    @property
    def total_intake_liters(self) -> float:
        """Get total intake in liters."""
        return self.total_intake_ml / 1000.0

    @property
    def total_intake_oz(self) -> float:
        """Get total intake in fluid ounces."""
        return self.total_intake_ml / 29.5735

    @property
    def goal_liters(self) -> float:
        """Get goal in liters."""
        return self.goal_ml / 1000.0

    @property
    def goal_oz(self) -> float:
        """Get goal in fluid ounces."""
        return self.goal_ml / 29.5735

    @property
    def goal_percentage(self) -> float:
        """Calculate percentage of hydration goal achieved."""
        if self.goal_ml > 0:
            return (self.total_intake_ml / self.goal_ml) * 100.0
        return 0.0

    @property
    def goal_reached(self) -> bool:
        """Check if hydration goal was reached."""
        return self.total_intake_ml >= self.goal_ml

    @property
    def net_intake_ml(self) -> int:
        """Get net intake (total intake minus sweat loss)."""
        return self.total_intake_ml - self.sweat_loss_ml

    @property
    def remaining_ml(self) -> int:
        """Get remaining intake to reach goal."""
        return max(0, self.goal_ml - self.total_intake_ml)
