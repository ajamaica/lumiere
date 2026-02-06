#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google Drive commands."""

import io
from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("drive", "v3", credentials=creds)


@click.group()
def cli():
    """Google Drive commands."""


@cli.command("list")
@click.option("-q", "--query", help="Drive search query")
@click.option("-n", "--limit", default=20, help="Max results")
def list_files(query: str, limit: int):
    """List files in Drive."""
    service = get_service()
    results = service.files().list(
        pageSize=limit,
        q=query,
        fields="files(id,name,mimeType,modifiedTime)",
    ).execute()

    files = results.get("files", [])
    if not files:
        click.echo("No files found.")
        return

    for f in files:
        click.echo(f"[{f['id']}] {f['name']} ({f['mimeType'].split('.')[-1]})")


@cli.command()
@click.argument("query")
def search(query: str):
    """Search files by name."""
    service = get_service()
    results = service.files().list(
        q=f"name contains '{query}'",
        fields="files(id,name,mimeType)",
    ).execute()

    files = results.get("files", [])
    if not files:
        click.echo("No files found.")
        return

    for f in files:
        click.echo(f"[{f['id']}] {f['name']}")


@cli.command()
@click.argument("file_id")
def get(file_id: str):
    """Get file metadata."""
    service = get_service()
    f = service.files().get(
        fileId=file_id,
        fields="id,name,mimeType,size,modifiedTime,webViewLink",
    ).execute()

    click.echo(f"Name: {f.get('name')}")
    click.echo(f"ID: {f.get('id')}")
    click.echo(f"Type: {f.get('mimeType')}")
    click.echo(f"Size: {f.get('size', 'N/A')} bytes")
    click.echo(f"Link: {f.get('webViewLink')}")


@cli.command()
@click.argument("file_id")
def download(file_id: str):
    """Download file content (prints to stdout)."""
    service = get_service()

    # Get file type
    meta = service.files().get(fileId=file_id, fields="mimeType").execute()
    mime = meta.get("mimeType", "")

    # Export Google Docs types
    if "google-apps" in mime:
        export = "text/csv" if "spreadsheet" in mime else "text/plain"
        content = service.files().export(fileId=file_id, mimeType=export).execute()
        click.echo(content.decode("utf-8"))
    else:
        fh = io.BytesIO()
        request = service.files().get_media(fileId=file_id)
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        click.echo(fh.getvalue().decode("utf-8", errors="replace"))


@cli.command()
@click.argument("name")
@click.option("--parent", help="Parent folder ID")
def create_folder(name: str, parent: str):
    """Create a folder."""
    service = get_service()
    metadata = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent:
        metadata["parents"] = [parent]

    folder = service.files().create(body=metadata, fields="id,webViewLink").execute()
    click.echo(f"Created folder: {name}")
    click.echo(f"ID: {folder.get('id')}")
    click.echo(f"Link: {folder.get('webViewLink')}")


@cli.command()
@click.argument("name")
def find_folder(name: str):
    """Find folder by name."""
    service = get_service()
    results = service.files().list(
        q=f"name = '{name}' and mimeType = 'application/vnd.google-apps.folder'",
        fields="files(id,name)",
    ).execute()

    folders = results.get("files", [])
    if not folders:
        click.echo("No folders found.")
        return

    for f in folders:
        click.echo(f"[{f['id']}] {f['name']}")


if __name__ == "__main__":
    cli()
