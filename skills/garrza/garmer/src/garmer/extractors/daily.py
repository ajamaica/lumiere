"""Daily summary data extractor for Garmin Connect."""

import logging
from datetime import date, datetime

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import DailySummary

logger = logging.getLogger(__name__)


class DailyExtractor(BaseExtractor[DailySummary]):
    """Extractor for Garmin daily summary data."""

    def __init__(self, auth: GarminAuth):
        """Initialize the daily summary extractor."""
        super().__init__(auth)

    def get_for_date(self, target_date: date | datetime | str) -> DailySummary | None:
        """
        Get daily summary for a specific date.

        Args:
            target_date: The date to get the summary for

        Returns:
            Daily summary or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/usersummary-service/usersummary/daily/?calendarDate={date_str}",
            )
            if response:
                return DailySummary.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get daily summary for {date_str}: {e}")
            return None

    def get_weekly_summary(
        self,
        week_start: date | datetime | str | None = None,
    ) -> dict:
        """
        Get aggregated summary for a week.

        Args:
            week_start: Start of the week (defaults to this week's Monday)

        Returns:
            Dictionary with weekly summary data
        """
        if week_start is None:
            today = date.today()
            week_start = today - datetime.timedelta(days=today.weekday())

        start = (
            self._parse_date(week_start)
            if isinstance(week_start, str)
            else (
                week_start.date() if isinstance(week_start, datetime) else week_start
            )
        )
        end = start + datetime.timedelta(days=6)

        daily_data = self.get_for_date_range(start, end)

        if not daily_data:
            return {"days_with_data": 0}

        return {
            "days_with_data": len(daily_data),
            "total_steps": sum(d.total_steps for d in daily_data),
            "avg_steps": sum(d.total_steps for d in daily_data) / len(daily_data),
            "total_calories": sum(d.total_kilocalories for d in daily_data),
            "total_active_calories": sum(d.active_kilocalories for d in daily_data),
            "total_distance_km": sum(d.total_distance_meters for d in daily_data) / 1000,
            "avg_resting_hr": self._avg([d.resting_heart_rate for d in daily_data]),
            "avg_stress": self._avg([d.avg_stress_level for d in daily_data]),
            "total_floors": sum(d.floors_ascended for d in daily_data),
            "total_intensity_minutes": sum(
                d.moderate_intensity_minutes + (2 * d.vigorous_intensity_minutes)
                for d in daily_data
            ),
            "daily_summaries": daily_data,
        }

    def get_monthly_summary(
        self,
        year: int | None = None,
        month: int | None = None,
    ) -> dict:
        """
        Get aggregated summary for a month.

        Args:
            year: Year (defaults to current year)
            month: Month (defaults to current month)

        Returns:
            Dictionary with monthly summary data
        """
        today = date.today()
        year = year or today.year
        month = month or today.month

        start = date(year, month, 1)
        # Get last day of month
        if month == 12:
            end = date(year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            end = date(year, month + 1, 1) - datetime.timedelta(days=1)

        daily_data = self.get_for_date_range(start, end)

        if not daily_data:
            return {"days_with_data": 0}

        return {
            "year": year,
            "month": month,
            "days_with_data": len(daily_data),
            "total_steps": sum(d.total_steps for d in daily_data),
            "avg_steps": sum(d.total_steps for d in daily_data) / len(daily_data),
            "total_calories": sum(d.total_kilocalories for d in daily_data),
            "total_distance_km": sum(d.total_distance_meters for d in daily_data) / 1000,
            "avg_resting_hr": self._avg([d.resting_heart_rate for d in daily_data]),
            "avg_stress": self._avg([d.avg_stress_level for d in daily_data]),
        }

    @staticmethod
    def _avg(values: list) -> float | None:
        """Calculate average of non-None values."""
        valid = [v for v in values if v is not None]
        return sum(valid) / len(valid) if valid else None
