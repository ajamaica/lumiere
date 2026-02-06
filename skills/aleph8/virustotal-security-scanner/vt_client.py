#!/usr/bin/env python3
import argparse
import json
import os
import sys

import requests

VT_API_KEY = os.environ.get("VT_API_KEY")
VT_API_URL = "https://www.virustotal.com/api/v3"
VT_CACHE_DIR = os.path.expanduser("~/.vt")


def get_headers(content_type=None):
    if not VT_API_KEY:
        print("Error: VT_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)
    headers = {"x-apikey": VT_API_KEY, "Accept": "application/json"}
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def check_file(file_hash, use_cache=True):
    if use_cache:
        cache_path = os.path.join(VT_CACHE_DIR, f"{file_hash}.json")
        if os.path.exists(cache_path):
            with open(cache_path, "r") as f:
                return json.load(f)

    url = f"{VT_API_URL}/files/{file_hash}"
    response = requests.get(url, headers=get_headers())
    result = response.json()

    if response.status_code == 200 and use_cache:
        os.makedirs(VT_CACHE_DIR, exist_ok=True)
        with open(os.path.join(VT_CACHE_DIR, f"{file_hash}.json"), "w") as f:
            json.dump(result, f, indent=2)

    return result


def upload_file(filepath):
    if not os.path.exists(filepath):
        return {"error": "File not found"}

    file_size = os.path.getsize(filepath)

    # Large file (>32MB)
    if file_size > 32 * 1024 * 1024:
        upload_url_resp = requests.get(
            f"{VT_API_URL}/files/upload_url", headers=get_headers()
        )
        if upload_url_resp.status_code != 200:
            return upload_url_resp.json()

        upload_url = upload_url_resp.json()["data"]
        with open(filepath, "rb") as f:
            files = {"file": (os.path.basename(filepath), f)}
            response = requests.post(upload_url, files=files, headers=get_headers())
            return response.json()

    # Small file
    else:
        url = f"{VT_API_URL}/files"
        with open(filepath, "rb") as f:
            files = {"file": (os.path.basename(filepath), f)}
            response = requests.post(url, files=files, headers=get_headers())
            return response.json()


def get_comments(resource_id, is_url=False):
    type_segment = "urls" if is_url else "files"
    url = f"{VT_API_URL}/{type_segment}/{resource_id}/comments?limit=10"
    response = requests.get(url, headers=get_headers())
    return response.json()


def add_comment(resource_id, text, is_url=False):
    type_segment = "urls" if is_url else "files"
    url = f"{VT_API_URL}/{type_segment}/{resource_id}/comments"
    data = {"data": {"type": "comment", "attributes": {"text": text}}}
    response = requests.post(url, json=data, headers=get_headers("application/json"))
    return response.json()


def scan_url(url_to_scan):
    url = f"{VT_API_URL}/urls"
    data = {"url": url_to_scan}
    response = requests.post(
        url, data=data, headers=get_headers("application/x-www-form-urlencoded")
    )
    return response.json()


def get_url_report(url_id):
    url = f"{VT_API_URL}/urls/{url_id}"
    response = requests.get(url, headers=get_headers())
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="VirusTotal API Client")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # check-file
    check_parser = subparsers.add_parser("check-file", help="Check a file hash")
    check_parser.add_argument("hash", help="SHA256 hash of the file")

    # upload-file
    upload_parser = subparsers.add_parser("upload-file", help="Upload a file")
    upload_parser.add_argument("filepath", help="Path to the file")

    # get-comments
    comments_parser = subparsers.add_parser(
        "get-comments", help="Get comments for a file or URL"
    )
    comments_parser.add_argument("id", help="File hash or URL ID")
    comments_parser.add_argument(
        "--url", action="store_true", help="Specify if the ID is for a URL"
    )

    # add-comment
    add_comment_parser = subparsers.add_parser(
        "add-comment", help="Add a comment to a file or URL"
    )
    add_comment_parser.add_argument("id", help="File hash or URL ID")
    add_comment_parser.add_argument("text", help="Comment text")
    add_comment_parser.add_argument(
        "--url", action="store_true", help="Specify if the ID is for a URL"
    )

    # scan-url
    scan_url_parser = subparsers.add_parser("scan-url", help="Scan a URL")
    scan_url_parser.add_argument("url", help="URL to scan")

    # check-url
    check_url_parser = subparsers.add_parser("check-url", help="Get a URL report")
    check_url_parser.add_argument("id", help="URL ID (usually SHA256 of the URL)")

    args = parser.parse_args()

    if args.command == "check-file":
        print(json.dumps(check_file(args.hash), indent=2))
    elif args.command == "upload-file":
        print(json.dumps(upload_file(args.filepath), indent=2))
    elif args.command == "get-comments":
        print(json.dumps(get_comments(args.id, args.url), indent=2))
    elif args.command == "add-comment":
        print(json.dumps(add_comment(args.id, args.text, args.url), indent=2))
    elif args.command == "scan-url":
        print(json.dumps(scan_url(args.url), indent=2))
    elif args.command == "check-url":
        print(json.dumps(get_url_report(args.id), indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
