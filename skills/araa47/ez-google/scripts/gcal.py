#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google Calendar commands."""

from datetime import datetime
from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("calendar", "v3", credentials=creds)


@click.group()
def cli():
    """Google Calendar commands."""


@cli.command("list")
@click.argument("date", default="today")
def list_events(date: str):
    """List events for DATE (YYYY-MM-DD or 'today')."""
    service = get_service()
    d = datetime.now() if date == "today" else datetime.strptime(date, "%Y-%m-%d")

    events = service.events().list(
        calendarId="primary",
        timeMin=d.replace(hour=0, minute=0, second=0).isoformat() + "Z",
        timeMax=d.replace(hour=23, minute=59, second=59).isoformat() + "Z",
        singleEvents=True,
        orderBy="startTime",
    ).execute().get("items", [])

    if not events:
        click.echo("No events found.")
        return

    for e in events:
        start = e["start"].get("dateTime", e["start"].get("date"))
        click.echo(f"- {start}: {e.get('summary', '(No title)')} [ID: {e['id']}]")


def normalize_datetime(dt_str: str) -> str:
    """Normalize datetime to ISO format with seconds."""
    # Add :00 seconds if missing (YYYY-MM-DDTHH:MM -> YYYY-MM-DDTHH:MM:00)
    if len(dt_str) == 16:  # YYYY-MM-DDTHH:MM
        return dt_str + ":00"
    return dt_str


@cli.command()
@click.argument("title")
@click.argument("start")
@click.argument("end")
@click.option("--tz", default="America/Los_Angeles", help="Timezone")
@click.option("--attendee", "-a", multiple=True, help="Attendee email")
def create(title: str, start: str, end: str, tz: str, attendee: tuple):
    """Create event. START/END: YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS"""
    service = get_service()
    event = {
        "summary": title,
        "start": {"dateTime": normalize_datetime(start), "timeZone": tz},
        "end": {"dateTime": normalize_datetime(end), "timeZone": tz},
    }
    if attendee:
        event["attendees"] = [{"email": a} for a in attendee]

    result = service.events().insert(calendarId="primary", body=event).execute()
    click.echo(f"Created: {result.get('summary')}")
    click.echo(f"Link: {result.get('htmlLink')}")


@cli.command()
@click.argument("event_id")
def get(event_id: str):
    """Get event details."""
    service = get_service()
    e = service.events().get(calendarId="primary", eventId=event_id).execute()
    click.echo(f"Title: {e.get('summary')}")
    click.echo(f"Start: {e['start'].get('dateTime', e['start'].get('date'))}")
    click.echo(f"End: {e['end'].get('dateTime', e['end'].get('date'))}")
    if e.get("attendees"):
        click.echo("Attendees:")
        for a in e["attendees"]:
            click.echo(f"  - {a['email']} ({a.get('responseStatus', 'unknown')})")


@cli.command()
@click.argument("event_id")
def delete(event_id: str):
    """Delete event."""
    service = get_service()
    service.events().delete(calendarId="primary", eventId=event_id).execute()
    click.echo("Event deleted.")


@cli.command()
@click.argument("event_id")
@click.argument("response", type=click.Choice(["accepted", "declined", "tentative"]))
def respond(event_id: str, response: str):
    """Respond to event invitation."""
    service = get_service()
    event = service.events().get(calendarId="primary", eventId=event_id).execute()
    attendees = event.get("attendees", [])
    if not attendees:
        raise click.ClickException("Cannot respond to event without attendees.")
    for a in attendees:
        if a.get("self"):
            a["responseStatus"] = response
    service.events().patch(calendarId="primary", eventId=event_id, body={"attendees": attendees}).execute()
    click.echo(f"Responded: {response}")


@cli.command("calendars")
def list_calendars():
    """List all calendars."""
    service = get_service()
    for cal in service.calendarList().list().execute().get("items", []):
        click.echo(f"- {cal.get('summary')} [{cal.get('id')}]")


if __name__ == "__main__":
    cli()
