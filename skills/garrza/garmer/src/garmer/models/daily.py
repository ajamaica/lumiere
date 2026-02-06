"""Daily summary data models for comprehensive daily health metrics."""

from datetime import datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel


class DailyStats(GarminBaseModel):
    """Aggregated daily statistics across multiple metrics."""

    calendar_date: str

    # Steps and activity
    total_steps: int = 0
    step_goal: int = 10000
    total_distance_meters: float = 0.0
    active_calories: int = 0
    total_calories: int = 0
    floors_ascended: float = 0.0

    # Heart rate
    resting_heart_rate: int | None = None
    max_heart_rate: int | None = None
    min_heart_rate: int | None = None

    # Sleep (from previous night)
    sleep_duration_seconds: int = 0
    sleep_score: int | None = None

    # Stress
    avg_stress_level: int | None = None
    max_stress_level: int | None = None

    # Body battery
    body_battery_high: int | None = None
    body_battery_low: int | None = None
    body_battery_charged: int | None = None
    body_battery_drained: int | None = None

    # Intensity minutes
    moderate_intensity_minutes: int = 0
    vigorous_intensity_minutes: int = 0

    # Respiration
    avg_respiration_rate: float | None = None

    # SpO2
    avg_spo2: float | None = None
    lowest_spo2: float | None = None


class DailySummary(GarminBaseModel):
    """Complete daily summary with all available health metrics."""

    # Date info
    calendar_date: str = Field(alias="calendarDate")
    start_timestamp: datetime | None = Field(alias="startTimestampGMT", default=None)
    end_timestamp: datetime | None = Field(alias="endTimestampGMT", default=None)

    # Activity summary
    total_steps: int = Field(alias="totalSteps", default=0)
    daily_step_goal: int = Field(alias="dailyStepGoal", default=10000)
    total_distance_meters: int = Field(alias="totalDistanceMeters", default=0)

    # Calories
    total_kilocalories: int = Field(alias="totalKilocalories", default=0)
    active_kilocalories: int = Field(alias="activeKilocalories", default=0)
    bmr_kilocalories: int = Field(alias="bmrKilocalories", default=0)
    consumed_kilocalories: int | None = Field(
        alias="consumedKilocalories", default=None
    )
    net_calorie_goal: int | None = Field(alias="netCalorieGoal", default=None)
    remaining_kilocalories: int | None = Field(
        alias="remainingKilocalories", default=None
    )

    # Heart rate
    resting_heart_rate: int | None = Field(alias="restingHeartRate", default=None)
    min_heart_rate: int | None = Field(alias="minHeartRate", default=None)
    max_heart_rate: int | None = Field(alias="maxHeartRate", default=None)
    avg_heart_rate: int | None = Field(alias="averageHeartRate", default=None)

    # Stress
    avg_stress_level: int | None = Field(alias="averageStressLevel", default=None)
    max_stress_level: int | None = Field(alias="maxStressLevel", default=None)
    stress_duration: int = Field(alias="stressDuration", default=0)
    rest_stress_duration: int = Field(alias="restStressDuration", default=0)

    # Body battery
    body_battery_charged_value: int | None = Field(
        alias="bodyBatteryChargedValue", default=None
    )
    body_battery_drained_value: int | None = Field(
        alias="bodyBatteryDrainedValue", default=None
    )
    body_battery_highest_value: int | None = Field(
        alias="bodyBatteryHighestValue", default=None
    )
    body_battery_lowest_value: int | None = Field(
        alias="bodyBatteryLowestValue", default=None
    )
    body_battery_most_recent_value: int | None = Field(
        alias="bodyBatteryMostRecentValue", default=None
    )

    # Floors (API returns floats for partial floors)
    floors_ascended: float = Field(alias="floorsAscended", default=0.0)
    floors_descended: float = Field(alias="floorsDescended", default=0.0)
    floors_ascended_goal: int = Field(alias="floorsAscendedGoal", default=10)

    # Intensity minutes
    moderate_intensity_minutes: int = Field(alias="moderateIntensityMinutes", default=0)
    vigorous_intensity_minutes: int = Field(alias="vigorousIntensityMinutes", default=0)
    intensity_minutes_goal: int = Field(alias="intensityMinutesGoal", default=150)

    # Activity durations (in seconds)
    highly_active_seconds: int = Field(alias="highlyActiveSeconds", default=0)
    active_seconds: int = Field(alias="activeSeconds", default=0)
    sedentary_seconds: int = Field(alias="sedentarySeconds", default=0)
    sleeping_seconds: int = Field(alias="sleepingSeconds", default=0)

    # Respiration
    avg_waking_respiration_value: float | None = Field(
        alias="avgWakingRespirationValue", default=None
    )
    highest_respiration_value: float | None = Field(
        alias="highestRespirationValue", default=None
    )
    lowest_respiration_value: float | None = Field(
        alias="lowestRespirationValue", default=None
    )

    # SpO2
    avg_spo2_value: float | None = Field(alias="averageSpO2", default=None)
    lowest_spo2_value: float | None = Field(alias="lowestSpO2", default=None)
    latest_spo2_value: float | None = Field(alias="latestSpO2", default=None)

    # HRV
    hrv_status: str | None = Field(alias="hrvStatus", default=None)

    # Activity count
    activities_count: int = Field(alias="activitiesCount", default=0)

    # User profile
    user_daily_summary_id: int | None = Field(alias="userDailySummaryId", default=None)

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "DailySummary":
        """Parse daily summary from Garmin API response."""

        # Helper to get value with None coalescing (handles explicit None from API)
        def get_int(key: str, default: int = 0) -> int:
            val = data.get(key)
            return val if val is not None else default

        def get_float(key: str, default: float | None = None) -> float | None:
            val = data.get(key)
            return val if val is not None else default

        return cls(
            calendar_date=data.get("calendarDate") or "",
            total_steps=get_int("totalSteps", 0),
            daily_step_goal=get_int("dailyStepGoal", 10000),
            total_distance_meters=get_int("totalDistanceMeters", 0),
            total_kilocalories=get_int("totalKilocalories", 0),
            active_kilocalories=get_int("activeKilocalories", 0),
            bmr_kilocalories=get_int("bmrKilocalories", 0),
            consumed_kilocalories=data.get("consumedKilocalories"),
            net_calorie_goal=data.get("netCalorieGoal"),
            remaining_kilocalories=data.get("remainingKilocalories"),
            resting_heart_rate=data.get("restingHeartRate"),
            min_heart_rate=data.get("minHeartRate"),
            max_heart_rate=data.get("maxHeartRate"),
            avg_heart_rate=data.get("averageHeartRate"),
            avg_stress_level=data.get("averageStressLevel"),
            max_stress_level=data.get("maxStressLevel"),
            stress_duration=get_int("stressDuration", 0),
            rest_stress_duration=get_int("restStressDuration", 0),
            body_battery_charged_value=data.get("bodyBatteryChargedValue"),
            body_battery_drained_value=data.get("bodyBatteryDrainedValue"),
            body_battery_highest_value=data.get("bodyBatteryHighestValue"),
            body_battery_lowest_value=data.get("bodyBatteryLowestValue"),
            body_battery_most_recent_value=data.get("bodyBatteryMostRecentValue"),
            floors_ascended=get_float("floorsAscended", 0.0) or 0.0,
            floors_descended=get_float("floorsDescended", 0.0) or 0.0,
            floors_ascended_goal=get_int("floorsAscendedGoal", 10),
            moderate_intensity_minutes=get_int("moderateIntensityMinutes", 0),
            vigorous_intensity_minutes=get_int("vigorousIntensityMinutes", 0),
            intensity_minutes_goal=get_int("intensityMinutesGoal", 150),
            highly_active_seconds=get_int("highlyActiveSeconds", 0),
            active_seconds=get_int("activeSeconds", 0),
            sedentary_seconds=get_int("sedentarySeconds", 0),
            sleeping_seconds=get_int("sleepingSeconds", 0),
            avg_waking_respiration_value=get_float("avgWakingRespirationValue"),
            highest_respiration_value=get_float("highestRespirationValue"),
            lowest_respiration_value=get_float("lowestRespirationValue"),
            avg_spo2_value=get_float("averageSpO2"),
            lowest_spo2_value=get_float("lowestSpO2"),
            latest_spo2_value=get_float("latestSpO2"),
            hrv_status=data.get("hrvStatus"),
            activities_count=get_int("activitiesCount", 0),
            user_daily_summary_id=data.get("userDailySummaryId"),
            raw_data=data,
        )

    @property
    def step_goal_percentage(self) -> float:
        """Calculate percentage of step goal achieved."""
        if self.daily_step_goal > 0:
            return (self.total_steps / self.daily_step_goal) * 100.0
        return 0.0

    @property
    def total_intensity_minutes(self) -> int:
        """Get total intensity minutes (moderate + 2*vigorous)."""
        return self.moderate_intensity_minutes + (2 * self.vigorous_intensity_minutes)

    @property
    def body_battery_net_change(self) -> int | None:
        """Get net body battery change for the day."""
        if (
            self.body_battery_charged_value is not None
            and self.body_battery_drained_value is not None
        ):
            return self.body_battery_charged_value - self.body_battery_drained_value
        return None

    def to_stats(self) -> DailyStats:
        """Convert to simplified DailyStats object."""
        return DailyStats(
            calendar_date=self.calendar_date,
            total_steps=self.total_steps,
            step_goal=self.daily_step_goal,
            total_distance_meters=float(self.total_distance_meters),
            active_calories=self.active_kilocalories,
            total_calories=self.total_kilocalories,
            floors_ascended=self.floors_ascended,
            resting_heart_rate=self.resting_heart_rate,
            max_heart_rate=self.max_heart_rate,
            min_heart_rate=self.min_heart_rate,
            avg_stress_level=self.avg_stress_level,
            max_stress_level=self.max_stress_level,
            body_battery_high=self.body_battery_highest_value,
            body_battery_low=self.body_battery_lowest_value,
            body_battery_charged=self.body_battery_charged_value,
            body_battery_drained=self.body_battery_drained_value,
            moderate_intensity_minutes=self.moderate_intensity_minutes,
            vigorous_intensity_minutes=self.vigorous_intensity_minutes,
            avg_respiration_rate=self.avg_waking_respiration_value,
            avg_spo2=self.avg_spo2_value,
            lowest_spo2=self.lowest_spo2_value,
        )
