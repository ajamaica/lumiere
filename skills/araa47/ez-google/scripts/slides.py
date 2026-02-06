#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google Slides commands."""

from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("slides", "v1", credentials=creds)


def get_drive_service():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("drive", "v3", credentials=creds)


@click.group()
def cli():
    """Google Slides commands."""


@cli.command()
@click.argument("query")
def find(query: str):
    """Find presentations by name."""
    drive = get_drive_service()
    results = drive.files().list(
        q=f"name contains '{query}' and mimeType = 'application/vnd.google-apps.presentation'",
        fields="files(id,name)",
    ).execute()

    files = results.get("files", [])
    if not files:
        click.echo("No presentations found.")
        return

    for f in files:
        click.echo(f"[{f['id']}] {f['name']}")


@cli.command()
@click.argument("presentation_id")
def get(presentation_id: str):
    """Get presentation metadata and slide titles."""
    service = get_service()
    presentation = service.presentations().get(presentationId=presentation_id).execute()

    click.echo(f"Title: {presentation.get('title')}")
    click.echo(f"Slides: {len(presentation.get('slides', []))}")
    click.echo("---")

    for i, slide in enumerate(presentation.get("slides", []), 1):
        # Try to get slide title from shapes
        title = "(No title)"
        for element in slide.get("pageElements", []):
            if "shape" in element:
                shape = element["shape"]
                if shape.get("placeholder", {}).get("type") == "TITLE":
                    text_elements = shape.get("text", {}).get("textElements", [])
                    for te in text_elements:
                        if "textRun" in te:
                            title = te["textRun"].get("content", "").strip()
                            break
        click.echo(f"Slide {i}: {title}")


@cli.command()
@click.argument("presentation_id")
def text(presentation_id: str):
    """Extract all text from presentation."""
    service = get_service()
    presentation = service.presentations().get(presentationId=presentation_id).execute()

    click.echo(f"# {presentation.get('title')}\n")

    for i, slide in enumerate(presentation.get("slides", []), 1):
        click.echo(f"## Slide {i}")
        for element in slide.get("pageElements", []):
            if "shape" in element and "text" in element.get("shape", {}):
                for te in element["shape"]["text"].get("textElements", []):
                    if "textRun" in te:
                        content = te["textRun"].get("content", "").strip()
                        if content:
                            click.echo(content)
        click.echo()


@cli.command()
@click.argument("title")
def create(title: str):
    """Create a new presentation."""
    service = get_service()
    presentation = service.presentations().create(body={"title": title}).execute()

    click.echo(f"Created: {presentation.get('title')}")
    click.echo(f"ID: {presentation.get('presentationId')}")
    click.echo(f"Link: https://docs.google.com/presentation/d/{presentation.get('presentationId')}")


if __name__ == "__main__":
    cli()
