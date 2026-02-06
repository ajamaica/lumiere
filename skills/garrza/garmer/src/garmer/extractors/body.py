"""Body composition and weight data extractor for Garmin Connect."""

import logging
from datetime import date, datetime

from garmer.auth import GarminAuth
from garmer.extractors.base import BaseExtractor
from garmer.models import BodyComposition, Weight, HydrationData, RespirationData

logger = logging.getLogger(__name__)


class BodyExtractor(BaseExtractor[BodyComposition]):
    """Extractor for Garmin body composition, weight, hydration, and respiration data."""

    def __init__(self, auth: GarminAuth):
        """Initialize the body extractor."""
        super().__init__(auth)

    def get_for_date(
        self,
        target_date: date | datetime | str,
    ) -> BodyComposition | None:
        """
        Get body composition data for a specific date.

        Args:
            target_date: The date to get data for

        Returns:
            Body composition data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/weight-service/weight/dateRange",
                params={
                    "startDate": date_str,
                    "endDate": date_str,
                },
            )
            if response and "dailyWeightSummaries" in response:
                summaries = response["dailyWeightSummaries"]
                if summaries:
                    return BodyComposition.from_garmin_response(summaries[0])
            return None
        except Exception as e:
            logger.error(f"Failed to get body composition for {date_str}: {e}")
            return None

    def get_weight_for_date(
        self,
        target_date: date | datetime | str,
    ) -> Weight | None:
        """
        Get weight data for a specific date.

        Args:
            target_date: The date to get weight for

        Returns:
            Weight data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/weight-service/weight/dayview/{date_str}",
            )
            if response and response.get("totalAverage"):
                return Weight(
                    date=date_str,
                    weight_grams=int(response["totalAverage"]["weight"]),
                )
            return None
        except Exception as e:
            logger.error(f"Failed to get weight for {date_str}: {e}")
            return None

    def get_weight_range(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> list[Weight]:
        """
        Get weight data for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            List of weight measurements
        """
        start_str = self._format_date(start_date)
        end_str = self._format_date(end_date)

        try:
            response = self._make_request(
                f"/weight-service/weight/dateRange",
                params={
                    "startDate": start_str,
                    "endDate": end_str,
                },
            )
            if response and "dailyWeightSummaries" in response:
                return [
                    Weight.from_garmin_response(w)
                    for w in response["dailyWeightSummaries"]
                ]
            return []
        except Exception as e:
            logger.error(f"Failed to get weight range: {e}")
            return []

    def get_latest_weight(self) -> Weight | None:
        """
        Get the most recent weight measurement.

        Returns:
            Latest weight or None if not available
        """
        try:
            response = self._make_request(
                "/weight-service/weight/latest",
            )
            if response:
                return Weight.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get latest weight: {e}")
            return None

    def get_hydration_for_date(
        self,
        target_date: date | datetime | str,
    ) -> HydrationData | None:
        """
        Get hydration/water intake data for a specific date.

        Args:
            target_date: The date to get hydration data for

        Returns:
            Hydration data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            # Use the stats endpoint which is more reliable
            response = self._make_request(
                f"/usersummary-service/stats/hydration/daily/{date_str}/{date_str}",
            )
            if response and isinstance(response, list) and len(response) > 0:
                return HydrationData.from_garmin_response(response[0])
            return None
        except Exception as e:
            logger.error(f"Failed to get hydration data for {date_str}: {e}")
            return None

    def get_respiration_for_date(
        self,
        target_date: date | datetime | str,
    ) -> RespirationData | None:
        """
        Get respiration data for a specific date.

        Args:
            target_date: The date to get respiration data for

        Returns:
            Respiration data or None if not available
        """
        date_str = self._format_date(target_date)
        try:
            response = self._make_request(
                f"/wellness-service/wellness/dailyRespiration/?date={date_str}",
            )
            if response:
                return RespirationData.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get respiration data for {date_str}: {e}")
            return None

    def get_weight_stats(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> dict:
        """
        Get weight statistics for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Dictionary with weight statistics
        """
        weights = self.get_weight_range(start_date, end_date)

        if not weights:
            return {
                "measurements": 0,
                "start_weight_kg": None,
                "end_weight_kg": None,
                "min_weight_kg": None,
                "max_weight_kg": None,
                "weight_change_kg": None,
            }

        weight_kgs = [w.weight_kg for w in weights]

        return {
            "measurements": len(weights),
            "start_weight_kg": weights[0].weight_kg,
            "end_weight_kg": weights[-1].weight_kg,
            "min_weight_kg": min(weight_kgs),
            "max_weight_kg": max(weight_kgs),
            "avg_weight_kg": sum(weight_kgs) / len(weight_kgs),
            "weight_change_kg": weights[-1].weight_kg - weights[0].weight_kg,
            "weights": weights,
        }
