"""Heart rate data models for Garmin heart rate monitoring."""

from datetime import datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel, parse_garmin_timestamp


class HeartRateSample(GarminBaseModel):
    """A single heart rate measurement sample."""

    timestamp: datetime | None = None
    heart_rate: int = 0

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "HeartRateSample":
        """Parse heart rate sample from Garmin response."""
        return cls(
            timestamp=parse_garmin_timestamp(data.get("timestamp")),
            heart_rate=data.get("heartRate", data.get("value", 0)),
        )


class HeartRateZone(GarminBaseModel):
    """Heart rate training zone."""

    zone_number: int = 0
    zone_name: str = ""
    min_hr: int = 0
    max_hr: int = 0
    time_in_zone_seconds: int = Field(alias="secsInZone", default=0)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "HeartRateZone":
        """Parse heart rate zone from Garmin response."""
        return cls(
            zone_number=data.get("zoneNumber", 0),
            zone_name=data.get("zoneName", f"Zone {data.get('zoneNumber', 0)}"),
            min_hr=data.get("zoneLowBoundary", 0),
            max_hr=data.get("zoneHighBoundary", 0),
            time_in_zone_seconds=data.get("secsInZone", 0),
        )

    @property
    def time_in_zone_minutes(self) -> float:
        """Get time in zone in minutes."""
        return self.time_in_zone_seconds / 60.0


class HeartRateData(GarminBaseModel):
    """Heart rate data for a specific day or time period."""

    # Date info
    calendar_date: str | None = Field(alias="calendarDate", default=None)
    start_timestamp: datetime | None = Field(alias="startTimestampGMT", default=None)
    end_timestamp: datetime | None = Field(alias="endTimestampGMT", default=None)

    # Summary statistics
    resting_heart_rate: int | None = Field(alias="restingHeartRate", default=None)
    max_heart_rate: int | None = Field(alias="maxHeartRate", default=None)
    min_heart_rate: int | None = Field(alias="minHeartRate", default=None)
    avg_heart_rate: int | None = Field(alias="averageHeartRate", default=None)

    # Last 7-day average
    last_seven_days_avg_resting_hr: int | None = Field(
        alias="lastSevenDaysAvgRestingHeartRate", default=None
    )

    # Heart rate samples throughout the day
    heart_rate_samples: list[HeartRateSample] = Field(
        alias="heartRateValues", default_factory=list
    )

    # Heart rate zones
    heart_rate_zones: list[HeartRateZone] = Field(default_factory=list)

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "HeartRateData":
        """Parse heart rate data from Garmin API response."""
        # Parse heart rate samples
        samples = []
        raw_samples = data.get("heartRateValues", [])
        if raw_samples:
            for sample in raw_samples:
                if isinstance(sample, list) and len(sample) >= 2:
                    samples.append(
                        HeartRateSample(
                            timestamp=parse_garmin_timestamp(sample[0]),
                            heart_rate=sample[1] if sample[1] else 0,
                        )
                    )
                elif isinstance(sample, dict):
                    samples.append(HeartRateSample.from_garmin_response(sample))

        # Parse heart rate zones
        zones = []
        raw_zones = data.get("heartRateZones", [])
        for zone_data in raw_zones:
            zones.append(HeartRateZone.from_garmin_response(zone_data))

        return cls(
            calendar_date=data.get("calendarDate"),
            start_timestamp=parse_garmin_timestamp(data.get("startTimestampGMT")),
            end_timestamp=parse_garmin_timestamp(data.get("endTimestampGMT")),
            resting_heart_rate=data.get("restingHeartRate"),
            max_heart_rate=data.get("maxHeartRate"),
            min_heart_rate=data.get("minHeartRate"),
            avg_heart_rate=data.get("averageHeartRate"),
            last_seven_days_avg_resting_hr=data.get("lastSevenDaysAvgRestingHeartRate"),
            heart_rate_samples=samples,
            heart_rate_zones=zones,
            raw_data=data,
        )

    def get_samples_in_range(
        self, start: datetime, end: datetime
    ) -> list[HeartRateSample]:
        """Get heart rate samples within a time range."""
        return [
            s
            for s in self.heart_rate_samples
            if s.timestamp and start <= s.timestamp <= end
        ]

    def get_average_in_range(self, start: datetime, end: datetime) -> float | None:
        """Calculate average heart rate within a time range."""
        samples = self.get_samples_in_range(start, end)
        valid_samples = [s.heart_rate for s in samples if s.heart_rate > 0]
        if valid_samples:
            return sum(valid_samples) / len(valid_samples)
        return None
