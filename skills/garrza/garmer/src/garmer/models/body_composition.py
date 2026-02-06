"""Body composition data models for weight and body metrics."""

from datetime import datetime
from typing import Any

from pydantic import Field

from garmer.models.base import GarminBaseModel, parse_garmin_timestamp


class Weight(GarminBaseModel):
    """A single weight measurement."""

    # Identifiers
    sample_pk: int | None = Field(alias="samplePk", default=None)
    date: str | None = Field(alias="calendarDate", default=None)
    timestamp: datetime | None = None

    # Weight
    weight_grams: int = Field(alias="weight", default=0)

    # Source
    source_type: str | None = Field(alias="sourceType", default=None)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "Weight":
        """Parse weight data from Garmin response."""
        return cls(
            sample_pk=data.get("samplePk"),
            date=data.get("calendarDate"),
            timestamp=parse_garmin_timestamp(data.get("timestampGMT")),
            weight_grams=data.get("weight", 0),
            source_type=data.get("sourceType"),
        )

    @property
    def weight_kg(self) -> float:
        """Get weight in kilograms."""
        return self.weight_grams / 1000.0

    @property
    def weight_lbs(self) -> float:
        """Get weight in pounds."""
        return (self.weight_grams / 1000.0) * 2.20462


class BodyComposition(GarminBaseModel):
    """Body composition data including weight, body fat, muscle mass, etc."""

    # Identifiers
    sample_pk: int | None = Field(alias="samplePk", default=None)
    date: str | None = Field(alias="calendarDate", default=None)
    timestamp: datetime | None = None

    # Weight
    weight_grams: int = Field(alias="weight", default=0)

    # Body composition metrics (in grams or percentage)
    body_fat_percentage: float | None = Field(alias="bodyFat", default=None)
    body_water_percentage: float | None = Field(alias="bodyWater", default=None)
    bone_mass_grams: int | None = Field(alias="boneMass", default=None)
    muscle_mass_grams: int | None = Field(alias="muscleMass", default=None)
    visceral_fat_level: int | None = Field(alias="visceralFat", default=None)

    # Metabolic metrics
    metabolic_age: int | None = Field(alias="metabolicAge", default=None)
    physique_rating: int | None = Field(alias="physiqueRating", default=None)

    # BMI
    bmi: float | None = Field(alias="bMI", default=None)

    # Source
    source_type: str | None = Field(alias="sourceType", default=None)

    # Raw data
    raw_data: dict[str, Any] | None = Field(default=None, exclude=True)

    @classmethod
    def from_garmin_response(cls, data: dict[str, Any]) -> "BodyComposition":
        """Parse body composition data from Garmin API response."""
        return cls(
            sample_pk=data.get("samplePk"),
            date=data.get("calendarDate"),
            timestamp=parse_garmin_timestamp(data.get("timestampGMT")),
            weight_grams=data.get("weight", 0),
            body_fat_percentage=data.get("bodyFat"),
            body_water_percentage=data.get("bodyWater"),
            bone_mass_grams=data.get("boneMass"),
            muscle_mass_grams=data.get("muscleMass"),
            visceral_fat_level=data.get("visceralFat"),
            metabolic_age=data.get("metabolicAge"),
            physique_rating=data.get("physiqueRating"),
            bmi=data.get("bMI"),
            source_type=data.get("sourceType"),
            raw_data=data,
        )

    @property
    def weight_kg(self) -> float:
        """Get weight in kilograms."""
        return self.weight_grams / 1000.0

    @property
    def weight_lbs(self) -> float:
        """Get weight in pounds."""
        return (self.weight_grams / 1000.0) * 2.20462

    @property
    def bone_mass_kg(self) -> float | None:
        """Get bone mass in kilograms."""
        if self.bone_mass_grams:
            return self.bone_mass_grams / 1000.0
        return None

    @property
    def muscle_mass_kg(self) -> float | None:
        """Get muscle mass in kilograms."""
        if self.muscle_mass_grams:
            return self.muscle_mass_grams / 1000.0
        return None

    @property
    def lean_body_mass_kg(self) -> float | None:
        """Calculate lean body mass (weight minus fat)."""
        if self.body_fat_percentage is not None:
            fat_mass = self.weight_kg * (self.body_fat_percentage / 100.0)
            return self.weight_kg - fat_mass
        return None
