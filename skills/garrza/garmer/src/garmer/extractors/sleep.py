"""Sleep data extractor for Garmin Connect."""

import logging
from datetime import date, datetime

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import SleepData

logger = logging.getLogger(__name__)


class SleepExtractor(BaseExtractor[SleepData]):
    """Extractor for Garmin sleep data."""

    def __init__(self, auth: GarminAuth):
        """Initialize the sleep extractor."""
        super().__init__(auth)

    def get_for_date(self, target_date: date | datetime | str) -> SleepData | None:
        """
        Get sleep data for a specific date.

        Note: Sleep data for a date represents the sleep that ended on that date
        (i.e., the previous night's sleep).

        Args:
            target_date: The date to get sleep data for

        Returns:
            Sleep data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/wellness-service/wellness/dailySleepData/{self.username}?"
                f"nonSleepBufferMinutes=60&date={date_str}",
            )
            if response:
                return SleepData.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get sleep data for {date_str}: {e}")
            return None

    def get_sleep_details(
        self,
        target_date: date | datetime | str,
    ) -> SleepData | None:
        """
        Get detailed sleep data including sleep phases and movements.

        Args:
            target_date: The date to get sleep data for

        Returns:
            Detailed sleep data or None if not available
        """
        # The get_for_date method already fetches detailed data with buffer minutes
        return self.get_for_date(target_date)

    def get_sleep_stats(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> dict:
        """
        Get aggregated sleep statistics for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Dictionary with sleep statistics
        """
        sleep_data = self.get_for_date_range(start_date, end_date)

        if not sleep_data:
            return {
                "days_with_data": 0,
                "avg_sleep_hours": 0,
                "avg_deep_sleep_hours": 0,
                "avg_rem_sleep_hours": 0,
                "avg_sleep_score": None,
                "avg_resting_hr": None,
            }

        total_sleep = sum(s.total_sleep_seconds for s in sleep_data)
        total_deep = sum(s.deep_sleep_seconds for s in sleep_data)
        total_rem = sum(s.rem_sleep_seconds for s in sleep_data)

        days = len(sleep_data)

        scores = [s.overall_score for s in sleep_data if s.overall_score]
        avg_score = sum(scores) / len(scores) if scores else None

        hrs = [s.avg_sleep_heart_rate for s in sleep_data if s.avg_sleep_heart_rate]
        avg_hr = sum(hrs) / len(hrs) if hrs else None

        return {
            "days_with_data": days,
            "avg_sleep_hours": (total_sleep / days) / 3600.0 if days else 0,
            "avg_deep_sleep_hours": (total_deep / days) / 3600.0 if days else 0,
            "avg_rem_sleep_hours": (total_rem / days) / 3600.0 if days else 0,
            "avg_sleep_score": avg_score,
            "avg_resting_hr": avg_hr,
            "sleep_data": sleep_data,
        }

    def get_weekly_sleep_summary(self) -> dict:
        """
        Get sleep summary for the past week.

        Returns:
            Dictionary with weekly sleep statistics
        """
        end_date = date.today()
        start_date = end_date - datetime.timedelta(days=6)
        return self.get_sleep_stats(start_date, end_date)
