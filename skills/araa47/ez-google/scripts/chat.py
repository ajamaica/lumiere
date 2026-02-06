#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google Chat commands.

Note: Google Chat API requires a Google Workspace account.
Personal Gmail accounts may have limited access.
"""

from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("chat", "v1", credentials=creds)


@click.group()
def cli():
    """Google Chat commands."""


@cli.command()
def spaces():
    """List chat spaces (rooms, DMs)."""
    service = get_service()
    try:
        results = service.spaces().list().execute()
        spaces = results.get("spaces", [])

        if not spaces:
            click.echo("No spaces found.")
            return

        for space in spaces:
            space_type = space.get("spaceType", "UNKNOWN")
            name = space.get("displayName") or space.get("name", "")
            space_id = space.get("name", "").replace("spaces/", "")
            click.echo(f"[{space_id}] {name} ({space_type})")

    except Exception as e:
        if "403" in str(e) or "404" in str(e):
            click.echo("Error: Google Chat API requires a Google Workspace account.")
            click.echo("Personal Gmail accounts may not have access.")
        else:
            raise


@cli.command()
@click.argument("space_id")
@click.option("-n", "--limit", default=20, help="Max messages")
def messages(space_id: str, limit: int):
    """List messages in a space."""
    service = get_service()

    if not space_id.startswith("spaces/"):
        space_id = f"spaces/{space_id}"

    try:
        results = service.spaces().messages().list(
            parent=space_id,
            pageSize=limit
        ).execute()

        messages = results.get("messages", [])
        if not messages:
            click.echo("No messages found.")
            return

        for msg in messages:
            sender = msg.get("sender", {}).get("displayName", "Unknown")
            text = msg.get("text", "(no text)")
            msg_id = msg.get("name", "").split("/")[-1]
            click.echo(f"[{msg_id}] {sender}: {text[:100]}")

    except Exception as e:
        if "403" in str(e) or "404" in str(e):
            click.echo("Error: Google Chat API requires a Google Workspace account.")
        else:
            raise


@cli.command()
@click.argument("space_id")
@click.argument("text")
def send(space_id: str, text: str):
    """Send a message to a space."""
    service = get_service()

    if not space_id.startswith("spaces/"):
        space_id = f"spaces/{space_id}"

    try:
        result = service.spaces().messages().create(
            parent=space_id,
            body={"text": text}
        ).execute()

        click.echo(f"Message sent: {result.get('name')}")

    except Exception as e:
        if "403" in str(e) or "404" in str(e):
            click.echo("Error: Google Chat API requires a Google Workspace account.")
        else:
            raise


@cli.command()
@click.argument("space_id")
def get(space_id: str):
    """Get space details."""
    service = get_service()

    if not space_id.startswith("spaces/"):
        space_id = f"spaces/{space_id}"

    try:
        space = service.spaces().get(name=space_id).execute()

        click.echo(f"Name: {space.get('displayName', space.get('name'))}")
        click.echo(f"Type: {space.get('spaceType')}")
        click.echo(f"ID: {space.get('name')}")

    except Exception as e:
        if "403" in str(e) or "404" in str(e):
            click.echo("Error: Google Chat API requires a Google Workspace account.")
        else:
            raise


if __name__ == "__main__":
    cli()
