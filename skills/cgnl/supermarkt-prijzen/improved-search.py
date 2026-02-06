#!/usr/bin/env python3
"""Test: convert recipe titles to URLs"""
import re

def title_to_slug(title):
    """Convert recipe title to AH URL slug"""
    # Lowercase + replace spaces with hyphens
    slug = title.lower()
    # Remove special chars
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    return f"https://www.ah.nl/allerhande/recept/{slug}"

titles = [
    "Curry van bloemkool, aardappelen en eieren",
    "Bloemkool-aardappelovenschotel met gehakt en kaassaus"
]

for title in titles:
    print(f"{title}")
    print(f"  → {title_to_slug(title)}")
    print()
