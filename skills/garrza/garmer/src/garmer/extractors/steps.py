"""Steps data extractor for Garmin Connect."""

import logging
from datetime import date, datetime

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import StepsData

logger = logging.getLogger(__name__)


class StepsExtractor(BaseExtractor[StepsData]):
    """Extractor for Garmin step data."""

    def __init__(self, auth: GarminAuth):
        """Initialize the steps extractor."""
        super().__init__(auth)

    def get_for_date(self, target_date: date | datetime | str) -> StepsData | None:
        """
        Get step data for a specific date.

        Args:
            target_date: The date to get step data for

        Returns:
            Step data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/usersummary-service/usersummary/daily/?calendarDate={date_str}",
            )
            if response:
                return StepsData.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get step data for {date_str}: {e}")
            return None

    def get_total_steps(
        self,
        target_date: date | datetime | str,
    ) -> int | None:
        """
        Get total steps for a specific date.

        Args:
            target_date: The date to get steps for

        Returns:
            Total steps or None if not available
        """
        data = self.get_for_date(target_date)
        return data.total_steps if data else None

    def get_steps_timeseries(
        self,
        target_date: date | datetime | str,
    ) -> list[dict]:
        """
        Get step samples throughout the day.

        Args:
            target_date: The date to get data for

        Returns:
            List of step sample dictionaries
        """
        data = self.get_for_date(target_date)
        if not data:
            return []

        return [
            {
                "start_time": sample.start_time,
                "end_time": sample.end_time,
                "steps": sample.steps,
                "activity_type": sample.activity_type,
            }
            for sample in data.steps_samples
        ]

    def get_steps_stats(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> dict:
        """
        Get aggregated step statistics for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Dictionary with step statistics
        """
        steps_data = self.get_for_date_range(start_date, end_date)

        if not steps_data:
            return {
                "days_with_data": 0,
                "total_steps": 0,
                "avg_daily_steps": 0,
                "max_steps_day": 0,
                "min_steps_day": 0,
                "days_goal_reached": 0,
            }

        total_steps = sum(d.total_steps for d in steps_data)
        days = len(steps_data)
        step_counts = [d.total_steps for d in steps_data]
        goals_reached = sum(1 for d in steps_data if d.goal_reached)

        return {
            "days_with_data": days,
            "total_steps": total_steps,
            "avg_daily_steps": total_steps / days if days else 0,
            "max_steps_day": max(step_counts) if step_counts else 0,
            "min_steps_day": min(step_counts) if step_counts else 0,
            "days_goal_reached": goals_reached,
            "goal_reached_percentage": (goals_reached / days) * 100 if days else 0,
            "steps_data": steps_data,
        }

    def get_weekly_steps_summary(self) -> dict:
        """
        Get step summary for the past week.

        Returns:
            Dictionary with weekly step statistics
        """
        end_date = date.today()
        start_date = end_date - datetime.timedelta(days=6)
        return self.get_steps_stats(start_date, end_date)

    def get_floors_for_date(
        self,
        target_date: date | datetime | str,
    ) -> tuple[int, int] | None:
        """
        Get floors ascended and descended for a date.

        Args:
            target_date: The date to get floor data for

        Returns:
            Tuple of (floors_ascended, floors_descended) or None
        """
        data = self.get_for_date(target_date)
        if data:
            return (data.floors_ascended, data.floors_descended)
        return None

    def get_intensity_minutes(
        self,
        target_date: date | datetime | str,
    ) -> tuple[int, int] | None:
        """
        Get moderate and vigorous intensity minutes for a date.

        Args:
            target_date: The date to get data for

        Returns:
            Tuple of (moderate_minutes, vigorous_minutes) or None
        """
        data = self.get_for_date(target_date)
        if data:
            return (data.moderate_intensity_minutes, data.vigorous_intensity_minutes)
        return None
