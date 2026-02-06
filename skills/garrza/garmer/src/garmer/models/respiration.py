"""Respiration data models for breathing rate tracking."""

from datetime import datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel, parse_garmin_timestamp


class RespirationSample(GarminBaseModel):
    """A single respiration rate sample."""

    timestamp: datetime | None = None
    respiration_value: float | None = None

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "RespirationSample":
        """Parse respiration sample from Garmin response."""
        return cls(
            timestamp=parse_garmin_timestamp(data.get("startTimeGMT")),
            respiration_value=data.get("respirationValue"),
        )


class RespirationData(GarminBaseModel):
    """Respiration rate data for a specific day."""

    # Date info
    calendar_date: str | None = Field(alias="calendarDate", default=None)
    start_timestamp: datetime | None = Field(alias="startTimestampGMT", default=None)
    end_timestamp: datetime | None = Field(alias="endTimestampGMT", default=None)

    # Summary statistics (breaths per minute)
    avg_waking_respiration: float | None = Field(
        alias="avgWakingRespirationValue", default=None
    )
    avg_sleeping_respiration: float | None = Field(
        alias="avgSleepingRespirationValue", default=None
    )
    highest_respiration: float | None = Field(
        alias="highestRespirationValue", default=None
    )
    lowest_respiration: float | None = Field(
        alias="lowestRespirationValue", default=None
    )

    # Respiration samples throughout the day
    respiration_samples: list[RespirationSample] = Field(
        alias="respirationValuesArray", default_factory=list
    )

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "RespirationData":
        """Parse respiration data from Garmin API response."""
        # Parse respiration samples
        samples = []
        raw_samples = data.get("respirationValuesArray", [])
        if raw_samples:
            for sample in raw_samples:
                if isinstance(sample, list) and len(sample) >= 2:
                    samples.append(
                        RespirationSample(
                            timestamp=parse_garmin_timestamp(sample[0]),
                            respiration_value=sample[1],
                        )
                    )
                elif isinstance(sample, dict):
                    samples.append(RespirationSample.from_garmin_response(sample))

        return cls(
            calendar_date=data.get("calendarDate"),
            start_timestamp=parse_garmin_timestamp(data.get("startTimestampGMT")),
            end_timestamp=parse_garmin_timestamp(data.get("endTimestampGMT")),
            avg_waking_respiration=data.get("avgWakingRespirationValue"),
            avg_sleeping_respiration=data.get("avgSleepingRespirationValue"),
            highest_respiration=data.get("highestRespirationValue"),
            lowest_respiration=data.get("lowestRespirationValue"),
            respiration_samples=samples,
            raw_data=data,
        )

    def get_valid_samples(self) -> list[RespirationSample]:
        """Get only valid respiration measurements."""
        return [s for s in self.respiration_samples if s.respiration_value is not None]

    @property
    def respiration_range(self) -> float | None:
        """Get the range between highest and lowest respiration."""
        if self.highest_respiration and self.lowest_respiration:
            return self.highest_respiration - self.lowest_respiration
        return None
