"""User profile and settings models for Garmin accounts."""

from datetime import date, datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel


class UserSettings(GarminBaseModel):
    """User settings and preferences."""

    # Display preferences
    preferred_locale: str | None = Field(alias="preferredLocale", default=None)
    measurement_system: str | None = Field(alias="measurementSystem", default=None)
    date_format: str | None = Field(alias="dateFormat", default=None)
    time_format: str | None = Field(alias="timeFormat", default=None)

    # Goals
    step_goal: int = Field(alias="stepGoal", default=10000)
    floors_goal: int = Field(alias="floorsGoal", default=10)
    intensity_minutes_goal: int = Field(alias="intensityMinutesGoal", default=150)
    calories_goal: int | None = Field(alias="caloriesGoal", default=None)

    # Heart rate zones
    max_heart_rate: int | None = Field(alias="maxHeartRate", default=None)
    resting_heart_rate: int | None = Field(alias="restingHeartRate", default=None)

    # Sleep
    sleep_time: str | None = Field(alias="sleepTime", default=None)
    wake_time: str | None = Field(alias="wakeTime", default=None)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "UserSettings":
        """Parse user settings from Garmin API response."""
        return cls.model_validate(data)


class UserProfile(GarminBaseModel):
    """Garmin user profile information."""

    # Identity
    profile_id: int | None = Field(alias="profileId", default=None)
    garmin_guid: str | None = Field(alias="garminGUID", default=None)
    display_name: str | None = Field(alias="displayName", default=None)
    full_name: str | None = Field(alias="fullName", default=None)
    user_name: str | None = Field(alias="userName", default=None)

    # Personal info
    email: str | None = Field(alias="email", default=None)
    gender: str | None = Field(alias="gender", default=None)
    birth_date: date | None = Field(alias="birthDate", default=None)
    age: int | None = Field(default=None)

    # Physical attributes
    height_cm: float | None = Field(alias="height", default=None)
    weight_kg: float | None = Field(alias="weight", default=None)

    # Location
    country_code: str | None = Field(alias="countryCode", default=None)
    time_zone: str | None = Field(alias="timeZone", default=None)
    locale: str | None = Field(alias="locale", default=None)

    # Account info
    registration_date: datetime | None = Field(alias="registrationDate", default=None)

    # Avatar
    profile_image_url: str | None = Field(alias="profileImageUrl", default=None)
    profile_image_url_large: str | None = Field(
        alias="profileImageUrlLarge", default=None
    )

    # Settings
    settings: UserSettings | None = Field(default=None)

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "UserProfile":
        """Parse user profile from Garmin API response."""
        # Parse birth date if string
        birth_date = data.get("birthDate")
        if isinstance(birth_date, str):
            try:
                birth_date = date.fromisoformat(birth_date)
            except ValueError:
                birth_date = None

        # Parse registration date
        reg_date = data.get("registrationDate")
        if isinstance(reg_date, str):
            try:
                reg_date = datetime.fromisoformat(reg_date.replace("Z", "+00:00"))
            except ValueError:
                reg_date = None

        # Parse settings if available
        settings_data = data.get("userSettings") or data.get("settings")
        settings = (
            UserSettings.from_garmin_response(settings_data) if settings_data else None
        )

        return cls(
            profile_id=data.get("profileId") or data.get("id"),
            garmin_guid=data.get("garminGUID"),
            display_name=data.get("displayName"),
            full_name=data.get("fullName"),
            user_name=data.get("userName"),
            email=data.get("email"),
            gender=data.get("gender"),
            birth_date=birth_date,
            age=data.get("age"),
            height_cm=data.get("height"),
            weight_kg=data.get("weight"),
            country_code=data.get("countryCode"),
            time_zone=data.get("timeZone"),
            locale=data.get("locale"),
            registration_date=reg_date,
            profile_image_url=data.get("profileImageUrl"),
            profile_image_url_large=data.get("profileImageUrlLarge"),
            settings=settings,
            raw_data=data,
        )

    @property
    def height_inches(self) -> float | None:
        """Get height in inches."""
        if self.height_cm:
            return self.height_cm / 2.54
        return None

    @property
    def height_feet_inches(self) -> tuple[int, float] | None:
        """Get height as (feet, inches) tuple."""
        if self.height_cm:
            total_inches = self.height_cm / 2.54
            feet = int(total_inches // 12)
            inches = total_inches % 12
            return (feet, round(inches, 1))
        return None

    @property
    def weight_lbs(self) -> float | None:
        """Get weight in pounds."""
        if self.weight_kg:
            return self.weight_kg * 2.20462
        return None

    @property
    def bmi(self) -> float | None:
        """Calculate BMI if height and weight are available."""
        if self.height_cm and self.weight_kg:
            height_m = self.height_cm / 100.0
            return self.weight_kg / (height_m**2)
        return None
