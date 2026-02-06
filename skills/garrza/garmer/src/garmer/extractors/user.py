"""User profile and settings extractor for Garmin Connect."""

import logging
from typing import Any

from garmer.auth import GarminAuth
from garmer.models import UserProfile, UserSettings

logger = logging.getLogger(__name__)


class UserExtractor:
    """Extractor for Garmin user profile and settings."""

    def __init__(self, auth: GarminAuth):
        """Initialize the user extractor."""
        self.auth = auth

    def _ensure_authenticated(self) -> None:
        """Ensure we have valid authentication before making requests."""
        self.auth.ensure_authenticated()

    def _make_request(self, endpoint: str, **kwargs: Any) -> Any:
        """Make an authenticated API request."""
        import garth
        self._ensure_authenticated()
        return garth.connectapi(endpoint, **kwargs)

    def get_profile(self) -> UserProfile | None:
        """
        Get the user's profile information.

        Returns:
            User profile or None if not available
        """
        try:
            response = self._make_request("/userprofile-service/socialProfile")
            if response:
                return UserProfile.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None

    def get_user_settings(self) -> UserSettings | None:
        """
        Get the user's settings and preferences.

        Returns:
            User settings or None if not available
        """
        try:
            response = self._make_request("/userprofile-service/userprofile/user-settings")
            if response:
                return UserSettings.from_garmin_response(response)
            return None
        except Exception as e:
            logger.error(f"Failed to get user settings: {e}")
            return None

    def get_personal_info(self) -> dict[str, Any] | None:
        """
        Get the user's personal information.

        Returns:
            Dictionary with personal info or None
        """
        try:
            response = self._make_request(
                "/userprofile-service/userprofile/personal-information"
            )
            return response
        except Exception as e:
            logger.error(f"Failed to get personal info: {e}")
            return None

    def get_goals(self) -> dict[str, Any] | None:
        """
        Get the user's fitness goals.

        Returns:
            Dictionary with goals or None
        """
        try:
            response = self._make_request("/goal-service/goal/goals")
            return response
        except Exception as e:
            logger.error(f"Failed to get goals: {e}")
            return None

    def get_devices(self) -> list[dict[str, Any]]:
        """
        Get the user's registered Garmin devices.

        Returns:
            List of device information dictionaries
        """
        try:
            response = self._make_request("/device-service/deviceregistration/devices")
            return response if isinstance(response, list) else []
        except Exception as e:
            logger.error(f"Failed to get devices: {e}")
            return []

    def get_device_settings(self, device_id: int) -> dict[str, Any] | None:
        """
        Get settings for a specific device.

        Args:
            device_id: The device ID

        Returns:
            Device settings or None
        """
        try:
            response = self._make_request(
                f"/device-service/deviceservice/device-info/settings/{device_id}"
            )
            return response
        except Exception as e:
            logger.error(f"Failed to get device settings for {device_id}: {e}")
            return None

    def get_full_profile(self) -> dict[str, Any]:
        """
        Get a comprehensive profile including settings, goals, and devices.

        Returns:
            Dictionary with complete user information
        """
        profile = self.get_profile()
        settings = self.get_user_settings()
        goals = self.get_goals()
        devices = self.get_devices()

        return {
            "profile": profile.to_dict() if profile else None,
            "settings": settings.to_dict() if settings else None,
            "goals": goals,
            "devices": devices,
        }
