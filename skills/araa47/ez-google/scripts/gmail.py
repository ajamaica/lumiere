#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Gmail commands."""

import base64
import math
from email.mime.text import MIMEText
from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"

# Gmail API batch limit
BATCH_SIZE = 1000


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("gmail", "v1", credentials=creds)


def collect_message_ids(service, query: str, max_results: int | None = None):
    """Collect all message IDs matching a query, with pagination."""
    ids = []
    page_token = None

    while True:
        results = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=min(500, max_results - len(ids)) if max_results else 500,
            pageToken=page_token,
        ).execute()

        messages = results.get("messages", [])
        ids.extend(m["id"] for m in messages)

        if max_results and len(ids) >= max_results:
            ids = ids[:max_results]
            break

        page_token = results.get("nextPageToken")
        if not page_token:
            break

    return ids


def batch_modify(service, message_ids: list[str], add_labels: list[str] | None = None,
                 remove_labels: list[str] | None = None):
    """Apply batchModify to messages in chunks of up to 1000."""
    if not message_ids:
        return 0

    total_batches = math.ceil(len(message_ids) / BATCH_SIZE)
    processed = 0

    for batch_num in range(total_batches):
        start = batch_num * BATCH_SIZE
        end = start + BATCH_SIZE
        batch_ids = message_ids[start:end]

        click.echo(f"Processing batch {batch_num + 1} of {total_batches}... ({len(batch_ids)} messages)")

        body = {"ids": batch_ids}
        if add_labels:
            body["addLabelIds"] = add_labels
        if remove_labels:
            body["removeLabelIds"] = remove_labels

        service.users().messages().batchModify(userId="me", body=body).execute()
        processed += len(batch_ids)

    return processed


def get_headers(msg):
    return {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}


@click.group()
def cli():
    """Gmail commands."""


@cli.command("list")
@click.option("-q", "--query", help="Gmail search query")
@click.option("-n", "--limit", default=10, help="Max results")
def list_messages(query: str, limit: int):
    """List recent emails."""
    service = get_service()
    results = service.users().messages().list(
        userId="me", q=query, maxResults=limit
    ).execute()

    messages = results.get("messages", [])
    if not messages:
        click.echo("No messages found.")
        return

    for m in messages:
        msg = service.users().messages().get(
            userId="me", id=m["id"], format="metadata", metadataHeaders=["From", "Subject"]
        ).execute()
        h = get_headers(msg)
        click.echo(f"[{m['id']}] {h.get('Subject', '(No subject)')}")
        click.echo(f"  From: {h.get('From', 'Unknown')}")


@cli.command()
@click.argument("query")
def search(query: str):
    """Search emails."""
    service = get_service()
    results = service.users().messages().list(userId="me", q=query, maxResults=10).execute()

    messages = results.get("messages", [])
    if not messages:
        click.echo("No messages found.")
        return

    for m in messages:
        msg = service.users().messages().get(
            userId="me", id=m["id"], format="metadata", metadataHeaders=["From", "Subject"]
        ).execute()
        h = get_headers(msg)
        click.echo(f"[{m['id']}] {h.get('Subject', '(No subject)')}")


@cli.command()
@click.argument("message_id")
def get(message_id: str):
    """Read email content."""
    service = get_service()
    msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
    h = get_headers(msg)

    click.echo(f"From: {h.get('From', 'Unknown')}")
    click.echo(f"To: {h.get('To', 'Unknown')}")
    click.echo(f"Subject: {h.get('Subject', '(No subject)')}")
    click.echo("-" * 40)

    payload = msg.get("payload", {})
    body = ""
    if "body" in payload and payload["body"].get("data"):
        body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8")
    elif "parts" in payload:
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                break

    click.echo(body or "(No text body)")


@cli.command()
@click.argument("to")
@click.argument("subject")
@click.argument("body")
def send(to: str, subject: str, body: str):
    """Send email."""
    service = get_service()

    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    service.users().messages().send(userId="me", body={"raw": raw}).execute()
    click.echo(f"Email sent to {to}")


@cli.command()
@click.argument("to")
@click.argument("subject")
@click.argument("body")
def draft(to: str, subject: str, body: str):
    """Create draft email."""
    service = get_service()

    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    result = service.users().drafts().create(
        userId="me", body={"message": {"raw": raw}}
    ).execute()
    click.echo(f"Draft created: {result.get('id')}")


@cli.command()
def labels():
    """List Gmail labels."""
    service = get_service()
    results = service.users().labels().list(userId="me").execute()
    for label in results.get("labels", []):
        click.echo(f"- {label['name']} [{label['id']}]")


@cli.command("bulk-label")
@click.argument("query")
@click.option("--add", "-a", "add_labels", multiple=True, help="Label IDs to add")
@click.option("--remove", "-r", "remove_labels", multiple=True, help="Label IDs to remove")
@click.option("--max", "-n", "max_results", type=int, help="Max messages to process")
def bulk_label(query: str, add_labels: tuple, remove_labels: tuple, max_results: int | None):
    """Bulk add/remove labels for messages matching a query.

    Uses batchModify to process up to 1000 messages per API call.
    Use 'labels' command to see available label IDs.

    Example: gmail.py bulk-label "from:newsletter@example.com" --add TRASH
    """
    if not add_labels and not remove_labels:
        raise click.ClickException("Must specify at least one --add or --remove label")

    service = get_service()

    click.echo(f"Collecting messages matching: {query}")
    message_ids = collect_message_ids(service, query, max_results)

    if not message_ids:
        click.echo("No messages found.")
        return

    click.echo(f"Found {len(message_ids)} messages to modify.")
    processed = batch_modify(service, message_ids, list(add_labels) or None, list(remove_labels) or None)
    click.echo(f"Done. Modified {processed} messages.")


@cli.command("bulk-trash")
@click.argument("query")
@click.option("--max", "-n", "max_results", type=int, help="Max messages to trash")
@click.option("--yes", "-y", is_flag=True, help="Skip confirmation prompt")
def bulk_trash(query: str, max_results: int | None, yes: bool):
    """Trash all messages matching a query.

    Uses batchModify to efficiently trash up to 1000 messages per API call.
    Messages go to Trash and can be recovered within 30 days.

    Example: gmail.py bulk-trash "from:spam@example.com older_than:30d"
    """
    service = get_service()

    click.echo(f"Collecting messages matching: {query}")
    message_ids = collect_message_ids(service, query, max_results)

    if not message_ids:
        click.echo("No messages found.")
        return

    click.echo(f"Found {len(message_ids)} messages to trash.")

    if not yes:
        click.confirm("Proceed with trashing these messages?", abort=True)

    processed = batch_modify(service, message_ids, add_labels=["TRASH"])
    click.echo(f"Done. Trashed {processed} messages.")


if __name__ == "__main__":
    cli()
