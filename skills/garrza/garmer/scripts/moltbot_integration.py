#!/usr/bin/env python3
"""
Example MoltBot integration using Garmer.

This module demonstrates how to integrate Garmer with MoltBot for
health insights and recommendations.
"""

import json
from datetime import date, datetime, timedelta
from typing import Any

from garmer import GarminClient
from garmer.auth import AuthenticationError


class GarminIntegration:
    """
    MoltBot integration for Garmin health data.

    This class provides methods that can be called by MoltBot to retrieve
    health insights and formatted data for AI analysis.
    """

    def __init__(self, client: GarminClient | None = None):
        """
        Initialize the Garmin integration.

        Args:
            client: Optional pre-configured GarminClient
        """
        self._client = client

    def _get_client(self) -> GarminClient:
        """Get or create the Garmin client."""
        if self._client is None:
            try:
                self._client = GarminClient.from_saved_tokens()
            except AuthenticationError:
                raise RuntimeError(
                    "Garmin not authenticated. Please run 'garmer login' first."
                )
        return self._client

    def is_connected(self) -> bool:
        """Check if Garmin is connected and authenticated."""
        try:
            self._get_client()
            return True
        except RuntimeError:
            return False

    def get_health_summary(self) -> dict[str, Any]:
        """
        Get a health summary suitable for MoltBot analysis.

        Returns:
            Dictionary with formatted health data for AI processing
        """
        client = self._get_client()
        snapshot = client.get_health_snapshot()

        # Format for AI consumption
        summary = {
            "date": snapshot["date"],
            "metrics": {},
            "insights": [],
        }

        # Process steps
        if snapshot.get("steps"):
            steps = snapshot["steps"]
            summary["metrics"]["steps"] = {
                "value": steps["total"],
                "goal": steps["goal"],
                "goal_reached": steps["goal_reached"],
                "percentage": (steps["total"] / steps["goal"]) * 100 if steps["goal"] else 0,
            }
            if steps["total"] < steps["goal"] * 0.5:
                summary["insights"].append("Step count is below 50% of daily goal")
            elif steps["goal_reached"]:
                summary["insights"].append("Daily step goal achieved!")

        # Process sleep
        if snapshot.get("sleep"):
            sleep = snapshot["sleep"]
            total_hours = sleep.get("total_sleep_seconds", 0) / 3600
            summary["metrics"]["sleep"] = {
                "hours": round(total_hours, 1),
                "score": sleep.get("overall_score"),
                "deep_sleep_hours": sleep.get("deep_sleep_seconds", 0) / 3600,
                "rem_sleep_hours": sleep.get("rem_sleep_seconds", 0) / 3600,
            }
            if total_hours < 6:
                summary["insights"].append("Sleep duration is below recommended 7-9 hours")
            if sleep.get("overall_score") and sleep["overall_score"] < 70:
                summary["insights"].append("Sleep quality score is below average")

        # Process heart rate
        if snapshot.get("heart_rate"):
            hr = snapshot["heart_rate"]
            summary["metrics"]["heart_rate"] = {
                "resting": hr.get("resting"),
                "max": hr.get("max"),
                "min": hr.get("min"),
            }
            if hr.get("resting") and hr["resting"] > 80:
                summary["insights"].append("Resting heart rate is elevated")

        # Process stress
        if snapshot.get("stress"):
            stress = snapshot["stress"]
            summary["metrics"]["stress"] = {
                "average_level": stress.get("avg_level"),
                "max_level": stress.get("max_level"),
                "high_stress_hours": stress.get("high_stress_hours", 0),
            }
            if stress.get("avg_level") and stress["avg_level"] > 50:
                summary["insights"].append("Average stress level is elevated")
            if stress.get("high_stress_hours", 0) > 4:
                summary["insights"].append("Extended periods of high stress detected")

        # Process hydration
        if snapshot.get("hydration"):
            hydration = snapshot["hydration"]
            summary["metrics"]["hydration"] = {
                "intake_ml": hydration.get("intake_ml", 0),
                "goal_ml": hydration.get("goal_ml", 0),
                "percentage": hydration.get("goal_percentage", 0),
            }
            if hydration.get("goal_percentage", 0) < 50:
                summary["insights"].append("Hydration is below 50% of daily goal")

        return summary

    def get_activity_insights(self, days: int = 7) -> dict[str, Any]:
        """
        Get activity insights for MoltBot analysis.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with activity analysis
        """
        client = self._get_client()
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        activities = client.get_activities(
            start_date=start_date,
            end_date=end_date,
            limit=100,
        )

        insights = {
            "period_days": days,
            "total_activities": len(activities),
            "activity_breakdown": {},
            "totals": {
                "duration_hours": 0,
                "distance_km": 0,
                "calories": 0,
            },
            "recommendations": [],
        }

        # Analyze activities
        activity_types: dict[str, dict[str, Any]] = {}
        for activity in activities:
            type_key = activity.activity_type_key

            if type_key not in activity_types:
                activity_types[type_key] = {
                    "count": 0,
                    "duration_hours": 0,
                    "distance_km": 0,
                    "calories": 0,
                }

            activity_types[type_key]["count"] += 1
            activity_types[type_key]["duration_hours"] += activity.duration_seconds / 3600
            activity_types[type_key]["distance_km"] += activity.distance_km
            activity_types[type_key]["calories"] += activity.calories

            insights["totals"]["duration_hours"] += activity.duration_seconds / 3600
            insights["totals"]["distance_km"] += activity.distance_km
            insights["totals"]["calories"] += activity.calories

        insights["activity_breakdown"] = activity_types

        # Generate recommendations
        total_hours = insights["totals"]["duration_hours"]

        if total_hours < 2.5:
            insights["recommendations"].append(
                "Activity level is below WHO recommendation of 150+ minutes per week"
            )
        elif total_hours >= 5:
            insights["recommendations"].append(
                "Excellent activity level! Meeting or exceeding recommendations"
            )

        if len(activity_types) == 1:
            insights["recommendations"].append(
                "Consider adding variety to your workouts for better overall fitness"
            )

        if len(activities) == 0:
            insights["recommendations"].append(
                "No activities recorded this period. Consider starting with light exercise"
            )

        return insights

    def get_sleep_trends(self, days: int = 7) -> dict[str, Any]:
        """
        Get sleep trend analysis for MoltBot.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with sleep trend analysis
        """
        client = self._get_client()
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        sleep_data = client._sleep.get_for_date_range(start_date, end_date)

        trends = {
            "period_days": days,
            "days_with_data": len(sleep_data),
            "averages": {},
            "trends": [],
            "recommendations": [],
        }

        if not sleep_data:
            trends["recommendations"].append("No sleep data available for analysis")
            return trends

        # Calculate averages
        total_sleep = sum(s.total_sleep_seconds for s in sleep_data)
        total_deep = sum(s.deep_sleep_seconds for s in sleep_data)
        total_rem = sum(s.rem_sleep_seconds for s in sleep_data)
        scores = [s.overall_score for s in sleep_data if s.overall_score]
        hrs = [s.avg_sleep_heart_rate for s in sleep_data if s.avg_sleep_heart_rate]

        days_count = len(sleep_data)
        trends["averages"] = {
            "sleep_hours": round(total_sleep / days_count / 3600, 1),
            "deep_sleep_hours": round(total_deep / days_count / 3600, 1),
            "rem_sleep_hours": round(total_rem / days_count / 3600, 1),
            "sleep_score": round(sum(scores) / len(scores)) if scores else None,
            "sleep_hr": round(sum(hrs) / len(hrs)) if hrs else None,
        }

        # Analyze trends
        avg_hours = trends["averages"]["sleep_hours"]
        if avg_hours < 7:
            trends["trends"].append("Average sleep is below recommended 7-9 hours")
            trends["recommendations"].append(
                "Try to increase sleep duration by going to bed 30 minutes earlier"
            )

        deep_percentage = (total_deep / total_sleep * 100) if total_sleep > 0 else 0
        if deep_percentage < 15:
            trends["trends"].append("Deep sleep percentage is below optimal")
            trends["recommendations"].append(
                "Avoid alcohol and heavy meals close to bedtime to improve deep sleep"
            )

        return trends

    def format_for_chat(self, data: dict[str, Any]) -> str:
        """
        Format health data as a chat message for MoltBot.

        Args:
            data: Health data dictionary

        Returns:
            Formatted string for chat display
        """
        return json.dumps(data, indent=2, default=str)

    def get_daily_briefing(self) -> str:
        """
        Generate a daily health briefing for MoltBot.

        Returns:
            Formatted briefing text
        """
        summary = self.get_health_summary()

        lines = [f"# Daily Health Briefing - {summary['date']}\n"]

        metrics = summary.get("metrics", {})

        if "steps" in metrics:
            s = metrics["steps"]
            lines.append(f"**Steps:** {s['value']:,} / {s['goal']:,} ({s['percentage']:.0f}%)")

        if "sleep" in metrics:
            sl = metrics["sleep"]
            lines.append(f"**Sleep:** {sl['hours']} hours (Score: {sl.get('score', 'N/A')})")

        if "heart_rate" in metrics:
            hr = metrics["heart_rate"]
            lines.append(f"**Resting HR:** {hr.get('resting', 'N/A')} bpm")

        if "stress" in metrics:
            st = metrics["stress"]
            lines.append(f"**Avg Stress:** {st.get('average_level', 'N/A')}")

        if "hydration" in metrics:
            h = metrics["hydration"]
            lines.append(f"**Hydration:** {h['percentage']:.0f}% of goal")

        if summary.get("insights"):
            lines.append("\n**Insights:**")
            for insight in summary["insights"]:
                lines.append(f"- {insight}")

        return "\n".join(lines)


# Example usage for MoltBot
def moltbot_health_query_handler(query: str) -> str:
    """
    Handle health-related queries from MoltBot.

    Args:
        query: The user's query

    Returns:
        Response text
    """
    integration = GarminIntegration()

    if not integration.is_connected():
        return "Garmin is not connected. Please authenticate first."

    query_lower = query.lower()

    if "summary" in query_lower or "today" in query_lower:
        return integration.get_daily_briefing()

    if "activity" in query_lower or "exercise" in query_lower or "workout" in query_lower:
        insights = integration.get_activity_insights()
        return integration.format_for_chat(insights)

    if "sleep" in query_lower:
        trends = integration.get_sleep_trends()
        return integration.format_for_chat(trends)

    # Default: return full health summary
    summary = integration.get_health_summary()
    return integration.format_for_chat(summary)


if __name__ == "__main__":
    # Example usage
    integration = GarminIntegration()

    if integration.is_connected():
        print(integration.get_daily_briefing())
        print("\n" + "=" * 50 + "\n")
        print("Activity Insights:")
        print(integration.format_for_chat(integration.get_activity_insights()))
    else:
        print("Please run 'garmer login' to authenticate first.")
