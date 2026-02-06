#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google Sheets commands."""

from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("sheets", "v4", credentials=creds)


def get_drive_service():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("drive", "v3", credentials=creds)


@click.group()
def cli():
    """Google Sheets commands."""


@cli.command()
@click.argument("spreadsheet_id")
@click.argument("range", default="Sheet1!A1:Z100")
def get(spreadsheet_id: str, range: str):
    """Read data from spreadsheet."""
    service = get_service()
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range=range
    ).execute()

    values = result.get("values", [])
    if not values:
        click.echo("No data found.")
        return

    for row in values:
        click.echo("\t".join(str(cell) for cell in row))


@cli.command()
@click.argument("spreadsheet_id")
def info(spreadsheet_id: str):
    """Get spreadsheet metadata."""
    service = get_service()
    result = service.spreadsheets().get(
        spreadsheetId=spreadsheet_id, fields="properties,sheets.properties"
    ).execute()

    props = result.get("properties", {})
    click.echo(f"Title: {props.get('title')}")
    click.echo(f"Locale: {props.get('locale')}")
    click.echo("Sheets:")
    for sheet in result.get("sheets", []):
        sp = sheet.get("properties", {})
        click.echo(f"  - {sp.get('title')} (ID: {sp.get('sheetId')})")


@cli.command()
@click.argument("title")
def create(title: str):
    """Create a new spreadsheet."""
    service = get_service()
    spreadsheet = {"properties": {"title": title}}
    result = service.spreadsheets().create(body=spreadsheet, fields="spreadsheetId,spreadsheetUrl").execute()
    click.echo(f"Created: {title}")
    click.echo(f"ID: {result.get('spreadsheetId')}")
    click.echo(f"URL: {result.get('spreadsheetUrl')}")


@cli.command()
@click.argument("query")
def find(query: str):
    """Find spreadsheets by name."""
    drive = get_drive_service()
    results = drive.files().list(
        q=f"name contains '{query}' and mimeType = 'application/vnd.google-apps.spreadsheet'",
        fields="files(id,name)",
    ).execute()

    files = results.get("files", [])
    if not files:
        click.echo("No spreadsheets found.")
        return

    for f in files:
        click.echo(f"[{f['id']}] {f['name']}")


@cli.command()
@click.argument("spreadsheet_id")
@click.argument("range")
@click.argument("values")
def write(spreadsheet_id: str, range: str, values: str):
    """Write data to spreadsheet. VALUES: comma-separated, rows separated by semicolon.

    Example: write ID "Sheet1!A1:B2" "a,b;c,d" writes a 2x2 grid.
    """
    service = get_service()
    # Parse values: "a,b;c,d" -> [["a","b"],["c","d"]]
    rows = [row.split(",") for row in values.split(";")]

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range,
        valueInputOption="USER_ENTERED",
        body={"values": rows}
    ).execute()
    click.echo(f"Data written to {range}")


@cli.command()
@click.argument("spreadsheet_id")
@click.argument("range")
@click.argument("values")
def append(spreadsheet_id: str, range: str, values: str):
    """Append rows to spreadsheet. VALUES: comma-separated, rows separated by semicolon.

    Example: append ID "Sheet1!A:B" "a,b;c,d" appends 2 rows.
    """
    service = get_service()
    rows = [row.split(",") for row in values.split(";")]

    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range=range,
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": rows}
    ).execute()
    click.echo(f"Data appended to {range}")


if __name__ == "__main__":
    cli()
