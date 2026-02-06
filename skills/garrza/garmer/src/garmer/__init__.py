"""
Garmer - Garmin data extraction tool for health insights and MoltBot integration.

This package provides a clean interface to extract health and fitness data
from Garmin Connect, including activities, sleep, heart rate, stress, and more.
"""

from garmer.client import GarminClient
from garmer.models import (
    Activity,
    DailySummary,
    HeartRateData,
    SleepData,
    StepsData,
    StressData,
    UserProfile,
)

__version__ = "0.1.0"
__all__ = [
    "GarminClient",
    "Activity",
    "DailySummary",
    "HeartRateData",
    "SleepData",
    "StepsData",
    "StressData",
    "UserProfile",
]
