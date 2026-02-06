"""Sleep data models for Garmin sleep tracking."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel, parse_garmin_timestamp


class SleepLevel(str, Enum):
    """Sleep level/phase types."""

    DEEP = "deep"
    LIGHT = "light"
    REM = "rem"
    AWAKE = "awake"
    UNMEASURABLE = "unmeasurable"


class SleepPhase(GarminBaseModel):
    """Represents a phase/segment within a sleep session."""

    start_time: datetime | None = None
    end_time: datetime | None = None
    level: SleepLevel = SleepLevel.UNMEASURABLE
    duration_seconds: int = 0

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "SleepPhase":
        """Parse sleep phase from Garmin response."""
        level_map = {
            "deep": SleepLevel.DEEP,
            "light": SleepLevel.LIGHT,
            "rem": SleepLevel.REM,
            "awake": SleepLevel.AWAKE,
        }
        raw_level = data.get("sleepLevel", "unmeasurable").lower()
        level = level_map.get(raw_level, SleepLevel.UNMEASURABLE)

        return cls(
            start_time=parse_garmin_timestamp(data.get("startGMT")),
            end_time=parse_garmin_timestamp(data.get("endGMT")),
            level=level,
            duration_seconds=data.get("durationInSeconds", 0),
        )


class SleepMovement(GarminBaseModel):
    """Represents movement data during sleep."""

    start_time: datetime | None = None
    end_time: datetime | None = None
    activity_level: float = 0.0

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "SleepMovement":
        """Parse sleep movement from Garmin response."""
        return cls(
            start_time=parse_garmin_timestamp(data.get("startGMT")),
            end_time=parse_garmin_timestamp(data.get("endGMT")),
            activity_level=data.get("activityLevel", 0.0),
        )


class SleepData(GarminBaseModel):
    """Represents a complete sleep session with all metrics."""

    # Identifiers
    sleep_id: int | None = Field(alias="id", default=None)
    user_profile_pk: int | None = Field(alias="userProfilePK", default=None)
    calendar_date: str | None = Field(alias="calendarDate", default=None)

    # Timing
    sleep_start: datetime | None = Field(alias="sleepStartTimestampGMT", default=None)
    sleep_end: datetime | None = Field(alias="sleepEndTimestampGMT", default=None)
    sleep_start_local: datetime | None = Field(alias="sleepStartTimestampLocal", default=None)
    sleep_end_local: datetime | None = Field(alias="sleepEndTimestampLocal", default=None)

    # Duration metrics (in seconds)
    total_sleep_seconds: int = Field(alias="sleepTimeSeconds", default=0)
    deep_sleep_seconds: int = Field(alias="deepSleepSeconds", default=0)
    light_sleep_seconds: int = Field(alias="lightSleepSeconds", default=0)
    rem_sleep_seconds: int = Field(alias="remSleepSeconds", default=0)
    awake_seconds: int = Field(alias="awakeSleepSeconds", default=0)
    unmeasurable_seconds: int = Field(alias="unmeasurableSleepSeconds", default=0)

    # Quality metrics
    sleep_score: int | None = Field(alias="sleepScores", default=None)
    overall_score: int | None = Field(alias="overallScore", default=None)
    quality_score: int | None = Field(alias="qualityScore", default=None)
    recovery_score: int | None = Field(alias="recoveryScore", default=None)
    rem_score: int | None = Field(alias="remScore", default=None)
    light_score: int | None = Field(alias="lightScore", default=None)
    deep_score: int | None = Field(alias="deepScore", default=None)
    restlessness_score: int | None = Field(alias="restlessnessScore", default=None)

    # Heart rate during sleep
    avg_sleep_heart_rate: int | None = Field(alias="averageSleepHeartRate", default=None)
    lowest_sleep_heart_rate: int | None = Field(alias="lowestSleepHeartRate", default=None)
    highest_sleep_heart_rate: int | None = Field(alias="highestSleepHeartRate", default=None)

    # Respiration
    avg_sleep_respiration: float | None = Field(alias="averageSleepRespiration", default=None)
    lowest_sleep_respiration: float | None = Field(alias="lowestSleepRespiration", default=None)
    highest_sleep_respiration: float | None = Field(alias="highestSleepRespiration", default=None)

    # SpO2
    avg_spo2: float | None = Field(alias="averageSpO2", default=None)
    lowest_spo2: float | None = Field(alias="lowestSpO2", default=None)

    # Stress
    avg_sleep_stress: float | None = Field(alias="averageSleepStress", default=None)

    # HRV
    avg_hrv: float | None = Field(alias="avgSleepHrv", default=None)
    hrv_status: str | None = Field(alias="hrvStatus", default=None)

    # Body battery
    body_battery_change: int | None = Field(alias="bodyBatteryChange", default=None)

    # Sleep phases breakdown
    sleep_phases: list[SleepPhase] = Field(default_factory=list)
    sleep_movements: list[SleepMovement] = Field(default_factory=list)

    # Feedback
    sleep_feedback: str | None = Field(alias="sleepFeedback", default=None)
    sleep_need: int | None = Field(alias="sleepNeed", default=None)

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "SleepData":
        """Parse sleep data from Garmin API response."""
        # Parse sleep phases if available
        sleep_phases = []
        raw_phases = data.get("sleepLevels", [])
        for phase_data in raw_phases:
            sleep_phases.append(SleepPhase.from_garmin_response(phase_data))

        # Parse sleep movements if available
        sleep_movements = []
        raw_movements = data.get("sleepMovement", [])
        for movement_data in raw_movements:
            sleep_movements.append(SleepMovement.from_garmin_response(movement_data))

        # Handle nested sleep scores
        sleep_scores = data.get("sleepScores", {})
        if isinstance(sleep_scores, dict):
            overall_score = sleep_scores.get("overall", {}).get("value")
            quality_score = sleep_scores.get("quality", {}).get("value")
            recovery_score = sleep_scores.get("recovery", {}).get("value")
            rem_score = sleep_scores.get("rem", {}).get("value")
            light_score = sleep_scores.get("light", {}).get("value")
            deep_score = sleep_scores.get("deep", {}).get("value")
        else:
            overall_score = quality_score = recovery_score = None
            rem_score = light_score = deep_score = None

        return cls(
            sleep_id=data.get("id"),
            user_profile_pk=data.get("userProfilePK"),
            calendar_date=data.get("calendarDate"),
            sleep_start=parse_garmin_timestamp(data.get("sleepStartTimestampGMT")),
            sleep_end=parse_garmin_timestamp(data.get("sleepEndTimestampGMT")),
            sleep_start_local=parse_garmin_timestamp(data.get("sleepStartTimestampLocal")),
            sleep_end_local=parse_garmin_timestamp(data.get("sleepEndTimestampLocal")),
            total_sleep_seconds=data.get("sleepTimeSeconds", 0),
            deep_sleep_seconds=data.get("deepSleepSeconds", 0),
            light_sleep_seconds=data.get("lightSleepSeconds", 0),
            rem_sleep_seconds=data.get("remSleepSeconds", 0),
            awake_seconds=data.get("awakeSleepSeconds", 0),
            unmeasurable_seconds=data.get("unmeasurableSleepSeconds", 0),
            overall_score=overall_score,
            quality_score=quality_score,
            recovery_score=recovery_score,
            rem_score=rem_score,
            light_score=light_score,
            deep_score=deep_score,
            restlessness_score=data.get("restlessnessScore"),
            avg_sleep_heart_rate=data.get("averageSleepHeartRate"),
            lowest_sleep_heart_rate=data.get("lowestSleepHeartRate"),
            highest_sleep_heart_rate=data.get("highestSleepHeartRate"),
            avg_sleep_respiration=data.get("averageSleepRespiration"),
            lowest_sleep_respiration=data.get("lowestSleepRespiration"),
            highest_sleep_respiration=data.get("highestSleepRespiration"),
            avg_spo2=data.get("averageSpO2"),
            lowest_spo2=data.get("lowestSpO2"),
            avg_sleep_stress=data.get("averageSleepStress"),
            avg_hrv=data.get("avgSleepHrv"),
            hrv_status=data.get("hrvStatus"),
            body_battery_change=data.get("bodyBatteryChange"),
            sleep_phases=sleep_phases,
            sleep_movements=sleep_movements,
            sleep_feedback=data.get("sleepFeedback"),
            sleep_need=data.get("sleepNeed"),
            raw_data=data,
        )

    @property
    def total_sleep_hours(self) -> float:
        """Get total sleep time in hours."""
        return self.total_sleep_seconds / 3600.0

    @property
    def deep_sleep_hours(self) -> float:
        """Get deep sleep time in hours."""
        return self.deep_sleep_seconds / 3600.0

    @property
    def light_sleep_hours(self) -> float:
        """Get light sleep time in hours."""
        return self.light_sleep_seconds / 3600.0

    @property
    def rem_sleep_hours(self) -> float:
        """Get REM sleep time in hours."""
        return self.rem_sleep_seconds / 3600.0

    @property
    def sleep_efficiency(self) -> float | None:
        """Calculate sleep efficiency (time asleep / time in bed)."""
        if self.sleep_start and self.sleep_end:
            time_in_bed = (self.sleep_end - self.sleep_start).total_seconds()
            if time_in_bed > 0:
                return (self.total_sleep_seconds / time_in_bed) * 100.0
        return None

    @property
    def deep_sleep_percentage(self) -> float:
        """Get deep sleep as percentage of total sleep."""
        if self.total_sleep_seconds > 0:
            return (self.deep_sleep_seconds / self.total_sleep_seconds) * 100.0
        return 0.0

    @property
    def rem_sleep_percentage(self) -> float:
        """Get REM sleep as percentage of total sleep."""
        if self.total_sleep_seconds > 0:
            return (self.rem_sleep_seconds / self.total_sleep_seconds) * 100.0
        return 0.0
