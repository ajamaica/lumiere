#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google Docs commands."""

from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("docs", "v1", credentials=creds)


def get_drive_service():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("drive", "v3", credentials=creds)


def extract_text(content):
    """Extract plain text from document content."""
    text = ""
    for element in content:
        if "paragraph" in element:
            for pe in element["paragraph"].get("elements", []):
                if "textRun" in pe:
                    text += pe["textRun"].get("content", "")
    return text


@click.group()
def cli():
    """Google Docs commands."""


@cli.command()
@click.argument("title")
def create(title: str):
    """Create a new Google Doc."""
    service = get_service()
    doc = service.documents().create(body={"title": title}).execute()
    click.echo(f"Created: {doc.get('title')}")
    click.echo(f"ID: {doc.get('documentId')}")


@cli.command()
@click.argument("doc_id")
def get(doc_id: str):
    """Get document content."""
    service = get_service()
    doc = service.documents().get(documentId=doc_id).execute()

    click.echo(f"Title: {doc.get('title')}")
    click.echo("-" * 40)

    content = doc.get("body", {}).get("content", [])
    text = extract_text(content)
    click.echo(text)


@cli.command()
@click.argument("doc_id")
@click.argument("text")
def insert(doc_id: str, text: str):
    """Insert text at beginning of document."""
    service = get_service()
    requests = [{"insertText": {"location": {"index": 1}, "text": text}}]
    service.documents().batchUpdate(documentId=doc_id, body={"requests": requests}).execute()
    click.echo("Text inserted.")


@cli.command()
@click.argument("doc_id")
@click.argument("text")
def append(doc_id: str, text: str):
    """Append text to end of document."""
    service = get_service()

    # Get document length
    doc = service.documents().get(documentId=doc_id).execute()
    end_index = doc.get("body", {}).get("content", [{}])[-1].get("endIndex", 1) - 1

    requests = [{"insertText": {"location": {"index": end_index}, "text": text}}]
    service.documents().batchUpdate(documentId=doc_id, body={"requests": requests}).execute()
    click.echo("Text appended.")


@cli.command()
@click.argument("doc_id")
@click.argument("find_text")
@click.argument("replace_text")
def replace(doc_id: str, find_text: str, replace_text: str):
    """Replace text in document."""
    service = get_service()
    requests = [{"replaceAllText": {"containsText": {"text": find_text, "matchCase": True}, "replaceText": replace_text}}]
    result = service.documents().batchUpdate(documentId=doc_id, body={"requests": requests}).execute()
    count = result.get("replies", [{}])[0].get("replaceAllText", {}).get("occurrencesChanged", 0)
    click.echo(f"Replaced {count} occurrences.")


@cli.command()
@click.argument("query")
def find(query: str):
    """Find Google Docs by title."""
    drive = get_drive_service()
    results = drive.files().list(
        q=f"name contains '{query}' and mimeType = 'application/vnd.google-apps.document'",
        fields="files(id,name)",
    ).execute()

    files = results.get("files", [])
    if not files:
        click.echo("No documents found.")
        return

    for f in files:
        click.echo(f"[{f['id']}] {f['name']}")


@cli.command()
@click.argument("doc_id")
@click.argument("folder_id")
def move(doc_id: str, folder_id: str):
    """Move document to folder."""
    drive = get_drive_service()

    # Get current parents
    file = drive.files().get(fileId=doc_id, fields="parents").execute()
    previous_parents = ",".join(file.get("parents", []))

    # Move to new folder
    drive.files().update(
        fileId=doc_id,
        addParents=folder_id,
        removeParents=previous_parents,
        fields="id,parents",
    ).execute()
    click.echo(f"Moved document to folder {folder_id}")


if __name__ == "__main__":
    cli()
