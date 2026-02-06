#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["google-api-python-client>=2.0.0", "google-auth>=2.0.0", "click>=8.0.0"]
# ///
"""Google People/Contacts commands."""

from pathlib import Path

import click
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = Path.home() / ".simple-google-workspace" / "token.json"


def get_service():
    if not TOKEN_FILE.exists():
        raise click.ClickException("Not authenticated. Run: uv run scripts/auth.py login")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    return build("people", "v1", credentials=creds)


@click.group()
def cli():
    """Google People/Contacts commands."""


@cli.command()
def me():
    """Get current user's profile."""
    service = get_service()
    profile = service.people().get(
        resourceName="people/me",
        personFields="names,emailAddresses,phoneNumbers,photos"
    ).execute()

    names = profile.get("names", [])
    if names:
        click.echo(f"Name: {names[0].get('displayName')}")

    emails = profile.get("emailAddresses", [])
    for email in emails:
        click.echo(f"Email: {email.get('value')}")

    phones = profile.get("phoneNumbers", [])
    for phone in phones:
        click.echo(f"Phone: {phone.get('value')}")


@cli.command()
@click.option("-n", "--limit", default=100, help="Max results")
def contacts(limit: int):
    """List contacts."""
    service = get_service()
    results = service.people().connections().list(
        resourceName="people/me",
        pageSize=limit,
        personFields="names,emailAddresses,phoneNumbers"
    ).execute()

    connections = results.get("connections", [])
    if not connections:
        click.echo("No contacts found.")
        return

    for person in connections:
        name = "Unknown"
        names = person.get("names", [])
        if names:
            name = names[0].get("displayName", "Unknown")

        emails = person.get("emailAddresses", [])
        email = emails[0].get("value") if emails else ""

        phones = person.get("phoneNumbers", [])
        phone = phones[0].get("value") if phones else ""

        resource_id = person.get("resourceName", "").replace("people/", "")
        click.echo(f"[{resource_id}] {name}")
        if email:
            click.echo(f"  Email: {email}")
        if phone:
            click.echo(f"  Phone: {phone}")


@cli.command()
@click.argument("query")
def search(query: str):
    """Search contacts by name."""
    service = get_service()
    results = service.people().searchContacts(
        query=query,
        readMask="names,emailAddresses,phoneNumbers"
    ).execute()

    contacts = results.get("results", [])
    if not contacts:
        click.echo("No contacts found.")
        return

    for result in contacts:
        person = result.get("person", {})
        name = "Unknown"
        names = person.get("names", [])
        if names:
            name = names[0].get("displayName", "Unknown")

        emails = person.get("emailAddresses", [])
        email = emails[0].get("value") if emails else ""

        click.echo(f"{name}")
        if email:
            click.echo(f"  Email: {email}")


@cli.command()
@click.argument("resource_id")
def get(resource_id: str):
    """Get contact details by ID."""
    service = get_service()

    # Add people/ prefix if not present
    if not resource_id.startswith("people/"):
        resource_id = f"people/{resource_id}"

    person = service.people().get(
        resourceName=resource_id,
        personFields="names,emailAddresses,phoneNumbers,organizations,addresses"
    ).execute()

    names = person.get("names", [])
    if names:
        click.echo(f"Name: {names[0].get('displayName')}")

    emails = person.get("emailAddresses", [])
    for email in emails:
        click.echo(f"Email: {email.get('value')}")

    phones = person.get("phoneNumbers", [])
    for phone in phones:
        click.echo(f"Phone: {phone.get('value')}")

    orgs = person.get("organizations", [])
    for org in orgs:
        click.echo(f"Org: {org.get('name', '')} - {org.get('title', '')}")


if __name__ == "__main__":
    cli()
