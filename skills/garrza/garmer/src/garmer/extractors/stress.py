"""Stress data extractor for Garmin Connect."""

import logging
from datetime import date, datetime

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import StressData

logger = logging.getLogger(__name__)


class StressExtractor(BaseExtractor[StressData]):
    """Extractor for Garmin stress data."""

    def __init__(self, auth: GarminAuth):
        """Initialize the stress extractor."""
        super().__init__(auth)

    def get_for_date(self, target_date: date | datetime | str) -> StressData | None:
        """
        Get stress data for a specific date.

        Args:
            target_date: The date to get stress data for

        Returns:
            Stress data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            # Use the stats endpoint which is more reliable
            response = self._make_request(
                f"/usersummary-service/stats/stress/daily/{date_str}/{date_str}",
            )
            if response and isinstance(response, list) and len(response) > 0:
                return StressData.from_garmin_response(response[0])
            return None
        except Exception as e:
            logger.error(f"Failed to get stress data for {date_str}: {e}")
            return None

    def get_stress_timeseries(
        self,
        target_date: date | datetime | str,
    ) -> list[tuple[datetime, int]]:
        """
        Get stress level samples as a time series.

        Args:
            target_date: The date to get data for

        Returns:
            List of (timestamp, stress_level) tuples
        """
        data = self.get_for_date(target_date)
        if not data:
            return []

        return [
            (sample.timestamp, sample.stress_level)
            for sample in data.stress_samples
            if sample.timestamp and sample.stress_level >= 0
        ]

    def get_stress_stats(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> dict:
        """
        Get aggregated stress statistics for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Dictionary with stress statistics
        """
        stress_data = self.get_for_date_range(start_date, end_date)

        if not stress_data:
            return {
                "days_with_data": 0,
                "avg_stress_level": None,
                "avg_rest_hours": 0,
                "avg_high_stress_hours": 0,
            }

        avg_levels = [d.avg_stress_level for d in stress_data if d.avg_stress_level]
        total_rest = sum(d.rest_stress_duration for d in stress_data)
        total_high = sum(d.high_stress_duration for d in stress_data)
        days = len(stress_data)

        return {
            "days_with_data": days,
            "avg_stress_level": sum(avg_levels) / len(avg_levels) if avg_levels else None,
            "avg_rest_hours": (total_rest / days) / 3600.0 if days else 0,
            "avg_high_stress_hours": (total_high / days) / 3600.0 if days else 0,
            "stress_data": stress_data,
        }

    def get_body_battery(
        self,
        target_date: date | datetime | str,
    ) -> dict | None:
        """
        Get body battery data for a specific date.

        Args:
            target_date: The date to get body battery data for

        Returns:
            Dictionary with body battery data or None
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/wellness-service/wellness/bodyBattery/reports/daily",
                params={
                    "startDate": date_str,
                    "endDate": date_str,
                },
            )
            if response and isinstance(response, list) and len(response) > 0:
                return response[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get body battery for {date_str}: {e}")
            return None
