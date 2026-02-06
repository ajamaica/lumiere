"""Heart rate data extractor for Garmin Connect."""

import logging
from datetime import date, datetime

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import HeartRateData

logger = logging.getLogger(__name__)


class HeartRateExtractor(BaseExtractor[HeartRateData]):
    """Extractor for Garmin heart rate data."""

    def __init__(self, auth: GarminAuth):
        """Initialize the heart rate extractor."""
        super().__init__(auth)

    def get_for_date(self, target_date: date | datetime | str) -> HeartRateData | None:
        """
        Get heart rate data for a specific date.

        Args:
            target_date: The date to get heart rate data for

        Returns:
            Heart rate data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/wellness-service/wellness/dailyHeartRate/?date={date_str}",
            )
            if response:
                return HeartRateData.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get heart rate data for {date_str}: {e}")
            return None

    def get_resting_heart_rate(
        self,
        target_date: date | datetime | str,
    ) -> int | None:
        """
        Get resting heart rate for a specific date.

        Args:
            target_date: The date to get resting HR for

        Returns:
            Resting heart rate or None if not available
        """
        data = self.get_for_date(target_date)
        return data.resting_heart_rate if data else None

    def get_heart_rate_timeseries(
        self,
        target_date: date | datetime | str,
    ) -> list[tuple[datetime, int]]:
        """
        Get heart rate samples as a time series.

        Args:
            target_date: The date to get data for

        Returns:
            List of (timestamp, heart_rate) tuples
        """
        data = self.get_for_date(target_date)
        if not data:
            return []

        return [
            (sample.timestamp, sample.heart_rate)
            for sample in data.heart_rate_samples
            if sample.timestamp and sample.heart_rate > 0
        ]

    def get_resting_hr_trend(
        self,
        days: int = 30,
    ) -> list[tuple[str, int | None]]:
        """
        Get resting heart rate trend over time.

        Args:
            days: Number of days to include

        Returns:
            List of (date_string, resting_hr) tuples
        """
        data = self.get_last_n_days(days)
        return [
            (d.calendar_date, d.resting_heart_rate)
            for d in data
            if d.calendar_date
        ]

    def get_heart_rate_stats(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> dict:
        """
        Get aggregated heart rate statistics for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Dictionary with heart rate statistics
        """
        hr_data = self.get_for_date_range(start_date, end_date)

        if not hr_data:
            return {
                "days_with_data": 0,
                "avg_resting_hr": None,
                "min_resting_hr": None,
                "max_resting_hr": None,
                "avg_max_hr": None,
            }

        resting_hrs = [d.resting_heart_rate for d in hr_data if d.resting_heart_rate]
        max_hrs = [d.max_heart_rate for d in hr_data if d.max_heart_rate]

        return {
            "days_with_data": len(hr_data),
            "avg_resting_hr": sum(resting_hrs) / len(resting_hrs) if resting_hrs else None,
            "min_resting_hr": min(resting_hrs) if resting_hrs else None,
            "max_resting_hr": max(resting_hrs) if resting_hrs else None,
            "avg_max_hr": sum(max_hrs) / len(max_hrs) if max_hrs else None,
            "hr_data": hr_data,
        }
