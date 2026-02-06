"""Steps data models for Garmin step tracking."""

from datetime import datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel, parse_garmin_timestamp


class StepsSample(GarminBaseModel):
    """A steps measurement for a time interval."""

    start_time: datetime | None = None
    end_time: datetime | None = None
    steps: int = 0
    activity_type: str | None = None

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "StepsSample":
        """Parse steps sample from Garmin response."""
        return cls(
            start_time=parse_garmin_timestamp(data.get("startGMT")),
            end_time=parse_garmin_timestamp(data.get("endGMT")),
            steps=data.get("steps", 0),
            activity_type=data.get("primaryActivityLevel"),
        )


class StepsData(GarminBaseModel):
    """Steps data for a specific day."""

    # Date info
    calendar_date: str | None = Field(alias="calendarDate", default=None)

    # Step counts
    total_steps: int = Field(alias="totalSteps", default=0)
    step_goal: int = Field(alias="stepGoal", default=10000)
    total_distance_meters: float = Field(alias="totalDistanceMeters", default=0.0)

    # Activity breakdown
    highly_active_seconds: int = Field(alias="highlyActiveSeconds", default=0)
    active_seconds: int = Field(alias="activeSeconds", default=0)
    sedentary_seconds: int = Field(alias="sedentarySeconds", default=0)
    sleeping_seconds: int = Field(alias="sleepingSeconds", default=0)

    # Floors
    floors_ascended: int = Field(alias="floorsAscended", default=0)
    floors_descended: int = Field(alias="floorsDescended", default=0)
    floors_goal: int = Field(alias="floorsGoal", default=10)

    # Intensity minutes
    moderate_intensity_minutes: int = Field(alias="moderateIntensityMinutes", default=0)
    vigorous_intensity_minutes: int = Field(alias="vigorousIntensityMinutes", default=0)
    intensity_minutes_goal: int = Field(alias="intensityMinutesGoal", default=150)

    # Steps samples throughout the day
    steps_samples: list[StepsSample] = Field(default_factory=list)

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "StepsData":
        """Parse steps data from Garmin API response."""
        # Parse step samples if available
        samples = []
        raw_samples = data.get("stepsSamples", [])
        for sample_data in raw_samples:
            samples.append(StepsSample.from_garmin_response(sample_data))

        return cls(
            calendar_date=data.get("calendarDate"),
            total_steps=data.get("totalSteps", 0),
            step_goal=data.get("stepGoal", 10000),
            total_distance_meters=data.get("totalDistanceMeters", 0.0),
            highly_active_seconds=data.get("highlyActiveSeconds", 0),
            active_seconds=data.get("activeSeconds", 0),
            sedentary_seconds=data.get("sedentarySeconds", 0),
            sleeping_seconds=data.get("sleepingSeconds", 0),
            floors_ascended=data.get("floorsAscended", 0),
            floors_descended=data.get("floorsDescended", 0),
            floors_goal=data.get("floorsGoal", 10),
            moderate_intensity_minutes=data.get("moderateIntensityMinutes", 0),
            vigorous_intensity_minutes=data.get("vigorousIntensityMinutes", 0),
            intensity_minutes_goal=data.get("intensityMinutesGoal", 150),
            steps_samples=samples,
            raw_data=data,
        )

    @property
    def goal_percentage(self) -> float:
        """Calculate percentage of step goal achieved."""
        if self.step_goal > 0:
            return (self.total_steps / self.step_goal) * 100.0
        return 0.0

    @property
    def goal_reached(self) -> bool:
        """Check if step goal was reached."""
        return self.total_steps >= self.step_goal

    @property
    def total_distance_km(self) -> float:
        """Get total distance in kilometers."""
        return self.total_distance_meters / 1000.0

    @property
    def total_distance_miles(self) -> float:
        """Get total distance in miles."""
        return self.total_distance_meters / 1609.344

    @property
    def highly_active_minutes(self) -> float:
        """Get highly active time in minutes."""
        return self.highly_active_seconds / 60.0

    @property
    def active_minutes(self) -> float:
        """Get active time in minutes."""
        return self.active_seconds / 60.0

    @property
    def sedentary_hours(self) -> float:
        """Get sedentary time in hours."""
        return self.sedentary_seconds / 3600.0

    @property
    def total_intensity_minutes(self) -> int:
        """Get total intensity minutes (moderate + 2*vigorous)."""
        return self.moderate_intensity_minutes + (2 * self.vigorous_intensity_minutes)

    @property
    def floors_goal_reached(self) -> bool:
        """Check if floors goal was reached."""
        return self.floors_ascended >= self.floors_goal
