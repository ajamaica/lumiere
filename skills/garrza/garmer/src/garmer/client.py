"""
Main Garmin Client for MoltBot integration.

This module provides the primary interface for extracting health and fitness
data from Garmin Connect.
"""

import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from garmer.auth import GarminAuth, create_auth
from garmer.extractors import (
    ActivityExtractor,
    BodyExtractor,
    DailyExtractor,
    HeartRateExtractor,
    SleepExtractor,
    StepsExtractor,
    StressExtractor,
    UserExtractor,
)
from garmer.models import (
    Activity,
    BodyComposition,
    DailySummary,
    HeartRateData,
    HydrationData,
    RespirationData,
    SleepData,
    StepsData,
    StressData,
    UserProfile,
    Weight,
)

logger = logging.getLogger(__name__)


class GarminClient:
    """
    Main client for Garmin data extraction.

    This class provides a unified interface for authenticating with Garmin Connect
    and extracting various health and fitness data. It's designed to be used as
    an integration for MoltBot.

    Example usage:
        ```python
        # Initialize and login
        client = GarminClient()
        client.login("email@example.com", "password")

        # Or use saved tokens
        client = GarminClient.from_saved_tokens()

        # Get today's summary
        summary = client.get_daily_summary()

        # Get comprehensive health snapshot
        snapshot = client.get_health_snapshot()
        ```
    """

    def __init__(
        self,
        auth: GarminAuth | None = None,
        token_dir: Path | str | None = None,
    ):
        """
        Initialize the Garmin client.

        Args:
            auth: Optional pre-configured GarminAuth instance
            token_dir: Directory to store authentication tokens
        """
        self.auth = auth or GarminAuth(token_dir=token_dir)

        # Initialize extractors (they will be lazily authenticated)
        self._activities = ActivityExtractor(self.auth)
        self._sleep = SleepExtractor(self.auth)
        self._heart_rate = HeartRateExtractor(self.auth)
        self._stress = StressExtractor(self.auth)
        self._steps = StepsExtractor(self.auth)
        self._daily = DailyExtractor(self.auth)
        self._body = BodyExtractor(self.auth)
        self._user = UserExtractor(self.auth)

    @classmethod
    def from_credentials(
        cls,
        email: str,
        password: str,
        token_dir: Path | str | None = None,
        save_tokens: bool = True,
    ) -> "GarminClient":
        """
        Create a client and login with credentials.

        Args:
            email: Garmin Connect email
            password: Garmin Connect password
            token_dir: Directory for token storage
            save_tokens: Whether to save tokens for future use

        Returns:
            Authenticated GarminClient instance
        """
        auth = GarminAuth(token_dir=token_dir)
        auth.login(email, password, save_tokens=save_tokens)
        return cls(auth=auth)

    @classmethod
    def from_saved_tokens(
        cls,
        token_dir: Path | str | None = None,
    ) -> "GarminClient":
        """
        Create a client using saved authentication tokens.

        Args:
            token_dir: Directory containing saved tokens

        Returns:
            GarminClient instance (may not be authenticated if no tokens found)

        Raises:
            AuthenticationError: If no saved tokens are found
        """
        auth = create_auth(token_dir=token_dir)
        if not auth.is_authenticated:
            from garmer.auth import AuthenticationError
            raise AuthenticationError(
                "No saved tokens found. Please login with credentials first."
            )
        return cls(auth=auth)

    def login(
        self,
        email: str,
        password: str,
        save_tokens: bool = True,
    ) -> bool:
        """
        Login to Garmin Connect.

        Args:
            email: Garmin Connect email
            password: Garmin Connect password
            save_tokens: Whether to save tokens for future use

        Returns:
            True if login was successful
        """
        return self.auth.login(email, password, save_tokens=save_tokens)

    def logout(self, delete_tokens: bool = True) -> None:
        """
        Logout and optionally delete saved tokens.

        Args:
            delete_tokens: Whether to delete saved tokens
        """
        self.auth.logout(delete_tokens=delete_tokens)

    @property
    def is_authenticated(self) -> bool:
        """Check if the client is authenticated."""
        return self.auth.is_authenticated

    # -------------------------------------------------------------------------
    # User Profile Methods
    # -------------------------------------------------------------------------

    def get_user_profile(self) -> UserProfile | None:
        """Get the user's profile information."""
        return self._user.get_profile()

    def get_user_devices(self) -> list[dict[str, Any]]:
        """Get the user's registered Garmin devices."""
        return self._user.get_devices()

    # -------------------------------------------------------------------------
    # Activity Methods
    # -------------------------------------------------------------------------

    def get_activities(
        self,
        start_date: date | datetime | str | None = None,
        end_date: date | datetime | str | None = None,
        activity_type: str | None = None,
        limit: int = 20,
    ) -> list[Activity]:
        """
        Get fitness activities.

        Args:
            start_date: Filter activities after this date
            end_date: Filter activities before this date
            activity_type: Filter by activity type
            limit: Maximum number of activities

        Returns:
            List of activities
        """
        return self._activities.get_activities(
            start_date=start_date,
            end_date=end_date,
            activity_type=activity_type,
            limit=limit,
        )

    def get_recent_activities(self, limit: int = 10) -> list[Activity]:
        """Get the most recent activities."""
        return self._activities.get_recent_activities(limit=limit)

    def get_activity(self, activity_id: int) -> Activity | None:
        """Get a specific activity by ID."""
        return self._activities.get_activity_by_id(activity_id)

    # -------------------------------------------------------------------------
    # Sleep Methods
    # -------------------------------------------------------------------------

    def get_sleep(
        self,
        target_date: date | datetime | str | None = None,
    ) -> SleepData | None:
        """
        Get sleep data for a date.

        Args:
            target_date: Date to get sleep for (defaults to today)

        Returns:
            Sleep data or None
        """
        target_date = target_date or date.today()
        return self._sleep.get_for_date(target_date)

    def get_sleep_range(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> list[SleepData]:
        """Get sleep data for a date range."""
        return self._sleep.get_for_date_range(start_date, end_date)

    def get_last_night_sleep(self) -> SleepData | None:
        """Get last night's sleep data."""
        return self._sleep.get_today()

    # -------------------------------------------------------------------------
    # Heart Rate Methods
    # -------------------------------------------------------------------------

    def get_heart_rate(
        self,
        target_date: date | datetime | str | None = None,
    ) -> HeartRateData | None:
        """
        Get heart rate data for a date.

        Args:
            target_date: Date to get HR for (defaults to today)

        Returns:
            Heart rate data or None
        """
        target_date = target_date or date.today()
        return self._heart_rate.get_for_date(target_date)

    def get_resting_heart_rate(
        self,
        target_date: date | datetime | str | None = None,
    ) -> int | None:
        """Get resting heart rate for a date."""
        target_date = target_date or date.today()
        return self._heart_rate.get_resting_heart_rate(target_date)

    # -------------------------------------------------------------------------
    # Stress Methods
    # -------------------------------------------------------------------------

    def get_stress(
        self,
        target_date: date | datetime | str | None = None,
    ) -> StressData | None:
        """
        Get stress data for a date.

        Args:
            target_date: Date to get stress for (defaults to today)

        Returns:
            Stress data or None
        """
        target_date = target_date or date.today()
        return self._stress.get_for_date(target_date)

    def get_body_battery(
        self,
        target_date: date | datetime | str | None = None,
    ) -> dict | None:
        """Get body battery data for a date."""
        target_date = target_date or date.today()
        return self._stress.get_body_battery(target_date)

    # -------------------------------------------------------------------------
    # Steps Methods
    # -------------------------------------------------------------------------

    def get_steps(
        self,
        target_date: date | datetime | str | None = None,
    ) -> StepsData | None:
        """
        Get step data for a date.

        Args:
            target_date: Date to get steps for (defaults to today)

        Returns:
            Steps data or None
        """
        target_date = target_date or date.today()
        return self._steps.get_for_date(target_date)

    def get_total_steps(
        self,
        target_date: date | datetime | str | None = None,
    ) -> int | None:
        """Get total steps for a date."""
        target_date = target_date or date.today()
        return self._steps.get_total_steps(target_date)

    # -------------------------------------------------------------------------
    # Daily Summary Methods
    # -------------------------------------------------------------------------

    def get_daily_summary(
        self,
        target_date: date | datetime | str | None = None,
    ) -> DailySummary | None:
        """
        Get daily summary for a date.

        Args:
            target_date: Date to get summary for (defaults to today)

        Returns:
            Daily summary or None
        """
        target_date = target_date or date.today()
        return self._daily.get_for_date(target_date)

    def get_weekly_summary(self) -> dict:
        """Get summary for the current week."""
        return self._daily.get_weekly_summary()

    # -------------------------------------------------------------------------
    # Body Composition Methods
    # -------------------------------------------------------------------------

    def get_weight(
        self,
        target_date: date | datetime | str | None = None,
    ) -> Weight | None:
        """Get weight for a date."""
        target_date = target_date or date.today()
        return self._body.get_weight_for_date(target_date)

    def get_latest_weight(self) -> Weight | None:
        """Get the most recent weight measurement."""
        return self._body.get_latest_weight()

    def get_body_composition(
        self,
        target_date: date | datetime | str | None = None,
    ) -> BodyComposition | None:
        """Get body composition for a date."""
        target_date = target_date or date.today()
        return self._body.get_for_date(target_date)

    def get_hydration(
        self,
        target_date: date | datetime | str | None = None,
    ) -> HydrationData | None:
        """Get hydration data for a date."""
        target_date = target_date or date.today()
        return self._body.get_hydration_for_date(target_date)

    def get_respiration(
        self,
        target_date: date | datetime | str | None = None,
    ) -> RespirationData | None:
        """Get respiration data for a date."""
        target_date = target_date or date.today()
        return self._body.get_respiration_for_date(target_date)

    # -------------------------------------------------------------------------
    # Comprehensive Health Data Methods (for MoltBot Integration)
    # -------------------------------------------------------------------------

    def get_health_snapshot(
        self,
        target_date: date | datetime | str | None = None,
    ) -> dict[str, Any]:
        """
        Get a comprehensive health snapshot for a date.

        This method is designed for MoltBot integration, providing all
        relevant health metrics in a single call.

        Args:
            target_date: Date to get snapshot for (defaults to today)

        Returns:
            Dictionary containing all health metrics
        """
        target_date = target_date or date.today()

        snapshot = {
            "date": str(target_date),
            "daily_summary": None,
            "sleep": None,
            "heart_rate": None,
            "stress": None,
            "steps": None,
            "hydration": None,
            "respiration": None,
        }

        # Get daily summary
        try:
            daily = self.get_daily_summary(target_date)
            if daily:
                snapshot["daily_summary"] = daily.to_dict()
        except Exception as e:
            logger.warning(f"Failed to get daily summary: {e}")

        # Get sleep (for the night ending on this date)
        try:
            sleep = self.get_sleep(target_date)
            if sleep:
                snapshot["sleep"] = sleep.to_dict()
        except Exception as e:
            logger.warning(f"Failed to get sleep data: {e}")

        # Get heart rate
        try:
            hr = self.get_heart_rate(target_date)
            if hr:
                snapshot["heart_rate"] = {
                    "resting": hr.resting_heart_rate,
                    "max": hr.max_heart_rate,
                    "min": hr.min_heart_rate,
                    "avg": hr.avg_heart_rate,
                }
        except Exception as e:
            logger.warning(f"Failed to get heart rate data: {e}")

        # Get stress
        try:
            stress = self.get_stress(target_date)
            if stress:
                snapshot["stress"] = {
                    "avg_level": stress.avg_stress_level,
                    "max_level": stress.max_stress_level,
                    "rest_hours": stress.rest_duration_hours,
                    "high_stress_hours": stress.high_stress_hours,
                }
        except Exception as e:
            logger.warning(f"Failed to get stress data: {e}")

        # Get steps
        try:
            steps = self.get_steps(target_date)
            if steps:
                snapshot["steps"] = {
                    "total": steps.total_steps,
                    "goal": steps.step_goal,
                    "goal_reached": steps.goal_reached,
                    "distance_km": steps.total_distance_km,
                    "floors_ascended": steps.floors_ascended,
                    "intensity_minutes": steps.total_intensity_minutes,
                }
        except Exception as e:
            logger.warning(f"Failed to get steps data: {e}")

        # Get hydration
        try:
            hydration = self.get_hydration(target_date)
            if hydration:
                snapshot["hydration"] = {
                    "intake_ml": hydration.total_intake_ml,
                    "goal_ml": hydration.goal_ml,
                    "goal_percentage": hydration.goal_percentage,
                }
        except Exception as e:
            logger.warning(f"Failed to get hydration data: {e}")

        # Get respiration
        try:
            respiration = self.get_respiration(target_date)
            if respiration:
                snapshot["respiration"] = {
                    "avg_waking": respiration.avg_waking_respiration,
                    "avg_sleeping": respiration.avg_sleeping_respiration,
                    "highest": respiration.highest_respiration,
                    "lowest": respiration.lowest_respiration,
                }
        except Exception as e:
            logger.warning(f"Failed to get respiration data: {e}")

        return snapshot

    def get_weekly_health_report(self) -> dict[str, Any]:
        """
        Get a comprehensive weekly health report.

        Returns:
            Dictionary containing weekly health metrics and trends
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=6)

        report = {
            "period": {
                "start": str(start_date),
                "end": str(end_date),
            },
            "activities": None,
            "sleep": None,
            "steps": None,
            "heart_rate": None,
            "stress": None,
        }

        # Activities summary
        try:
            activities = self.get_activities(
                start_date=start_date,
                end_date=end_date,
                limit=100,
            )
            if activities:
                report["activities"] = {
                    "count": len(activities),
                    "total_duration_hours": sum(a.duration_seconds for a in activities) / 3600,
                    "total_distance_km": sum(a.distance_meters for a in activities) / 1000,
                    "total_calories": sum(a.calories for a in activities),
                    "types": list(set(a.activity_type_key for a in activities)),
                }
        except Exception as e:
            logger.warning(f"Failed to get activities: {e}")

        # Sleep summary
        try:
            sleep_stats = self._sleep.get_sleep_stats(start_date, end_date)
            report["sleep"] = {
                "days_with_data": sleep_stats.get("days_with_data", 0),
                "avg_hours": sleep_stats.get("avg_sleep_hours", 0),
                "avg_deep_hours": sleep_stats.get("avg_deep_sleep_hours", 0),
                "avg_rem_hours": sleep_stats.get("avg_rem_sleep_hours", 0),
                "avg_score": sleep_stats.get("avg_sleep_score"),
            }
        except Exception as e:
            logger.warning(f"Failed to get sleep stats: {e}")

        # Steps summary
        try:
            steps_stats = self._steps.get_steps_stats(start_date, end_date)
            report["steps"] = {
                "total": steps_stats.get("total_steps", 0),
                "avg_daily": steps_stats.get("avg_daily_steps", 0),
                "max_day": steps_stats.get("max_steps_day", 0),
                "days_goal_reached": steps_stats.get("days_goal_reached", 0),
            }
        except Exception as e:
            logger.warning(f"Failed to get steps stats: {e}")

        # Heart rate summary
        try:
            hr_stats = self._heart_rate.get_heart_rate_stats(start_date, end_date)
            report["heart_rate"] = {
                "avg_resting": hr_stats.get("avg_resting_hr"),
                "min_resting": hr_stats.get("min_resting_hr"),
                "max_resting": hr_stats.get("max_resting_hr"),
            }
        except Exception as e:
            logger.warning(f"Failed to get heart rate stats: {e}")

        # Stress summary
        try:
            stress_stats = self._stress.get_stress_stats(start_date, end_date)
            report["stress"] = {
                "avg_level": stress_stats.get("avg_stress_level"),
                "avg_rest_hours": stress_stats.get("avg_rest_hours", 0),
                "avg_high_stress_hours": stress_stats.get("avg_high_stress_hours", 0),
            }
        except Exception as e:
            logger.warning(f"Failed to get stress stats: {e}")

        return report

    def export_data(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
        include_activities: bool = True,
        include_sleep: bool = True,
        include_daily: bool = True,
    ) -> dict[str, Any]:
        """
        Export comprehensive data for a date range.

        Useful for data analysis or backup.

        Args:
            start_date: Start date
            end_date: End date
            include_activities: Include activity data
            include_sleep: Include sleep data
            include_daily: Include daily summaries

        Returns:
            Dictionary with all requested data
        """
        export = {
            "period": {
                "start": str(start_date),
                "end": str(end_date),
            },
        }

        if include_activities:
            try:
                activities = self.get_activities(
                    start_date=start_date,
                    end_date=end_date,
                    limit=1000,
                )
                export["activities"] = [a.to_dict() for a in activities]
            except Exception as e:
                logger.warning(f"Failed to export activities: {e}")
                export["activities"] = []

        if include_sleep:
            try:
                sleep_data = self._sleep.get_for_date_range(start_date, end_date)
                export["sleep"] = [s.to_dict() for s in sleep_data]
            except Exception as e:
                logger.warning(f"Failed to export sleep data: {e}")
                export["sleep"] = []

        if include_daily:
            try:
                daily_data = self._daily.get_for_date_range(start_date, end_date)
                export["daily_summaries"] = [d.to_dict() for d in daily_data]
            except Exception as e:
                logger.warning(f"Failed to export daily summaries: {e}")
                export["daily_summaries"] = []

        return export
