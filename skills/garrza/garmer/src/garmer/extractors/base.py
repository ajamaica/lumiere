"""Base extractor class for Garmin data extraction."""

import logging
from abc import ABC, abstractmethod
from datetime import date, datetime, timedelta
from typing import Any, Generic, TypeVar

import garth

from garmer.auth import GarminAuth

logger = logging.getLogger(__name__)

T = TypeVar("T")


class BaseExtractor(ABC, Generic[T]):
    """
    Base class for all Garmin data extractors.

    Provides common functionality for making API requests and handling dates.
    """

    def __init__(self, auth: GarminAuth):
        """
        Initialize the extractor.

        Args:
            auth: Authenticated GarminAuth instance
        """
        self.auth = auth
        self._username: str | None = None

    def _ensure_authenticated(self) -> None:
        """Ensure we have valid authentication before making requests."""
        self.auth.ensure_authenticated()

    @property
    def username(self) -> str:
        """
        Get the authenticated user's username/display name.

        Required for certain API endpoints that include username in the path.
        """
        if self._username is None:
            self._ensure_authenticated()
            self._username = garth.client.username
        return self._username

    def _make_request(
        self,
        endpoint: str,
        method: str = "GET",
        **kwargs: Any,
    ) -> Any:
        """
        Make an authenticated API request.

        Args:
            endpoint: API endpoint path
            method: HTTP method
            **kwargs: Additional request parameters

        Returns:
            The response data
        """
        self._ensure_authenticated()
        return garth.connectapi(endpoint, method=method, **kwargs)

    @staticmethod
    def _format_date(d: date | datetime | str) -> str:
        """
        Format a date for API requests.

        Args:
            d: Date to format (date, datetime, or string)

        Returns:
            Date string in YYYY-MM-DD format
        """
        if isinstance(d, str):
            return d
        if isinstance(d, datetime):
            return d.strftime("%Y-%m-%d")
        return d.isoformat()

    @staticmethod
    def _parse_date(date_str: str) -> date:
        """
        Parse a date string.

        Args:
            date_str: Date string in YYYY-MM-DD format

        Returns:
            Parsed date object
        """
        return datetime.strptime(date_str, "%Y-%m-%d").date()

    @staticmethod
    def _get_date_range(
        start_date: date | datetime | str,
        end_date: date | datetime | str | None = None,
    ) -> tuple[str, str]:
        """
        Get a formatted date range.

        Args:
            start_date: Start date
            end_date: End date (defaults to start_date if not provided)

        Returns:
            Tuple of (start_date, end_date) as formatted strings
        """
        start = BaseExtractor._format_date(start_date)
        end = BaseExtractor._format_date(end_date) if end_date else start
        return start, end

    @staticmethod
    def _date_range_iterator(
        start_date: date,
        end_date: date,
    ):
        """
        Iterate through a date range.

        Args:
            start_date: Start date
            end_date: End date

        Yields:
            Each date in the range
        """
        current = start_date
        while current <= end_date:
            yield current
            current += timedelta(days=1)

    @abstractmethod
    def get_for_date(self, target_date: date | datetime | str) -> T | None:
        """
        Get data for a specific date.

        Args:
            target_date: The date to get data for

        Returns:
            The extracted data or None if not available
        """
        pass

    def get_for_date_range(
        self,
        start_date: date | datetime | str,
        end_date: date | datetime | str,
    ) -> list[T]:
        """
        Get data for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            List of extracted data for each date in the range
        """
        start = (
            self._parse_date(start_date)
            if isinstance(start_date, str)
            else (
                start_date.date() if isinstance(start_date, datetime) else start_date
            )
        )
        end = (
            self._parse_date(end_date)
            if isinstance(end_date, str)
            else end_date.date() if isinstance(end_date, datetime) else end_date
        )

        results = []
        for d in self._date_range_iterator(start, end):
            try:
                data = self.get_for_date(d)
                if data:
                    results.append(data)
            except Exception as e:
                logger.warning(f"Failed to get data for {d}: {e}")
                continue

        return results

    def get_today(self) -> T | None:
        """Get data for today."""
        return self.get_for_date(date.today())

    def get_yesterday(self) -> T | None:
        """Get data for yesterday."""
        return self.get_for_date(date.today() - timedelta(days=1))

    def get_last_n_days(self, n: int) -> list[T]:
        """
        Get data for the last n days.

        Args:
            n: Number of days to retrieve

        Returns:
            List of data for each day
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=n - 1)
        return self.get_for_date_range(start_date, end_date)
