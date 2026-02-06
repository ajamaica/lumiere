"""Activity data extractor for Garmin Connect."""

import logging
from datetime import date, datetime
from typing import Any

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import Activity, Lap

logger = logging.getLogger(__name__)


class ActivityExtractor(BaseExtractor[Activity]):
    """Extractor for Garmin fitness activities."""

    def __init__(self, auth: GarminAuth):
        """Initialize the activity extractor."""
        super().__init__(auth)

    def get_for_date(self, target_date: date | datetime | str) -> Activity | None:
        """
        Get the first/primary activity for a specific date.

        For multiple activities on a date, use get_activities_for_date().
        """
        activities = self.get_activities_for_date(target_date)
        return activities[0] if activities else None

    def get_activities_for_date(
        self,
        target_date: date | datetime | str,
    ) -> list[Activity]:
        """
        Get all activities for a specific date.

        Args:
            target_date: The date to get activities for

        Returns:
            List of activities for that date
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/activitylist-service/activities/search/activities",
                params={
                    "startDate": date_str,
                    "endDate": date_str,
                    "limit": 100,
                },
            )
            if response:
                return [Activity.from_garmin_response(a) for a in response]
            return []
        except Exception as e:
            logger.error(f"Failed to get activities for {date_str}: {e}")
            return []

    def get_activities(
        self,
        start_date: date | datetime | str | None = None,
        end_date: date | datetime | str | None = None,
        activity_type: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Activity]:
        """
        Get activities with optional filtering.

        Args:
            start_date: Filter activities after this date
            end_date: Filter activities before this date
            activity_type: Filter by activity type key
            limit: Maximum number of activities to return
            offset: Number of activities to skip (for pagination)

        Returns:
            List of matching activities
        """
        params: dict[str, Any] = {
            "limit": limit,
            "start": offset,
        }

        if start_date:
            params["startDate"] = self._format_date(start_date)
        if end_date:
            params["endDate"] = self._format_date(end_date)
        if activity_type:
            params["activityType"] = activity_type

        try:
            response = self._make_request(
                "/activitylist-service/activities/search/activities",
                params=params,
            )
            if response:
                return [Activity.from_garmin_response(a) for a in response]
            return []
        except Exception as e:
            logger.error(f"Failed to get activities: {e}")
            return []

    def get_recent_activities(self, limit: int = 10) -> list[Activity]:
        """
        Get the most recent activities.

        Args:
            limit: Maximum number of activities to return

        Returns:
            List of recent activities
        """
        return self.get_activities(limit=limit)

    def get_activity_by_id(self, activity_id: int) -> Activity | None:
        """
        Get a specific activity by its ID.

        Args:
            activity_id: The activity ID

        Returns:
            The activity or None if not found
        """
        try:
            response = self._make_request(
                f"/activity-service/activity/{activity_id}",
            )
            if response:
                return Activity.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get activity {activity_id}: {e}")
            return None

    def get_activity_details(self, activity_id: int) -> dict[str, Any] | None:
        """
        Get detailed data for an activity including GPS, HR samples, etc.

        Args:
            activity_id: The activity ID

        Returns:
            Dictionary with detailed activity data
        """
        try:
            response = self._make_request(
                f"/activity-service/activity/{activity_id}/details",
            )
            return response
        except Exception as e:
            logger.error(f"Failed to get activity details for {activity_id}: {e}")
            return None

    def get_activity_laps(self, activity_id: int) -> list[Lap]:
        """
        Get lap data for an activity.

        Args:
            activity_id: The activity ID

        Returns:
            List of laps
        """
        try:
            response = self._make_request(
                f"/activity-service/activity/{activity_id}/splits",
            )
            if response and "lapDTOs" in response:
                return [Lap.from_garmin_response(lap) for lap in response["lapDTOs"]]
            return []
        except Exception as e:
            logger.error(f"Failed to get laps for activity {activity_id}: {e}")
            return []

    def get_activity_hr_zones(self, activity_id: int) -> dict[str, Any] | None:
        """
        Get heart rate zone data for an activity.

        Args:
            activity_id: The activity ID

        Returns:
            Dictionary with HR zone data
        """
        try:
            response = self._make_request(
                f"/activity-service/activity/{activity_id}/hrTimeInZones",
            )
            return response
        except Exception as e:
            logger.error(f"Failed to get HR zones for activity {activity_id}: {e}")
            return None

    def get_activities_by_type(
        self,
        activity_type: str,
        limit: int = 20,
        start_date: date | datetime | str | None = None,
        end_date: date | datetime | str | None = None,
    ) -> list[Activity]:
        """
        Get activities filtered by type.

        Args:
            activity_type: Activity type key (e.g., 'running', 'cycling')
            limit: Maximum number to return
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            List of matching activities
        """
        return self.get_activities(
            activity_type=activity_type,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
        )

    def get_weekly_summary(
        self,
        week_start: date | datetime | str | None = None,
    ) -> dict[str, Any]:
        """
        Get a summary of activities for a week.

        Args:
            week_start: Start of the week (defaults to this week's Monday)

        Returns:
            Dictionary with weekly activity summary
        """
        if week_start is None:
            today = date.today()
            week_start = today - datetime.timedelta(days=today.weekday())

        start_str = self._format_date(week_start)
        end_date = (
            self._parse_date(start_str)
            if isinstance(week_start, str)
            else week_start
        )
        if isinstance(end_date, datetime):
            end_date = end_date.date()
        end = end_date + datetime.timedelta(days=6)

        activities = self.get_activities(start_date=week_start, end_date=end, limit=100)

        # Calculate summary
        total_distance = sum(a.distance_meters for a in activities)
        total_duration = sum(a.duration_seconds for a in activities)
        total_calories = sum(a.calories for a in activities)
        activity_count = len(activities)

        # Group by type
        by_type: dict[str, list[Activity]] = {}
        for activity in activities:
            type_key = activity.activity_type_key
            if type_key not in by_type:
                by_type[type_key] = []
            by_type[type_key].append(activity)

        return {
            "week_start": start_str,
            "activity_count": activity_count,
            "total_distance_km": total_distance / 1000.0,
            "total_duration_hours": total_duration / 3600.0,
            "total_calories": total_calories,
            "activities_by_type": {
                k: len(v) for k, v in by_type.items()
            },
            "activities": activities,
        }
