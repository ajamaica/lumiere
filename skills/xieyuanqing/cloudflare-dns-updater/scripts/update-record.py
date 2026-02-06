#!/usr/bin/env python3
#!/usr/bin/env python3
import os
import sys
import json
import requests
import argparse

def main():
    parser = argparse.ArgumentParser(description="Create or update a Cloudflare DNS A record.")
    parser.add_argument("--zone", required=True, help="The DNS zone name (e.g., your-domain.com)")
    parser.add_argument("--record", required=True, help="The record name (e.g., 'subdomain' for subdomain.your-domain.com)")
    parser.add_argument("--ip", required=True, help="The IP address to point the record to.")
    parser.add_argument("--proxied", type=lambda x: (str(x).lower() == 'true'), default=True, help="Whether the record is proxied by Cloudflare (default: True)")
    args = parser.parse_args()

    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    if not api_token:
        print("Error: CLOUDFLARE_API_TOKEN environment variable not set.", file=sys.stderr)
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    
    full_record_name = f"{args.record}.{args.zone}" if args.record != '@' and args.record != args.zone else args.zone

    # --- Get Zone ID ---
    try:
        zone_id_url = f"https://api.cloudflare.com/client/v4/zones?name={args.zone}"
        response = requests.get(zone_id_url, headers=headers, timeout=10)
        response.raise_for_status()
        zone_data = response.json()
        if not zone_data.get("result"):
            print(f"Error: Could not find Zone ID for '{args.zone}'. Response: {zone_data}", file=sys.stderr)
            sys.exit(1)
        zone_id = zone_data["result"][0]["id"]
        print(f"Found Zone ID: {zone_id} for zone '{args.zone}'")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Zone ID: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Check for existing Record ---
    try:
        record_url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?type=A&name={full_record_name}"
        response = requests.get(record_url, headers=headers, timeout=10)
        response.raise_for_status()
        record_data = response.json()
        existing_records = record_data.get("result", [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching DNS records: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Create or Update ---
    payload = {
        "type": "A",
        "name": full_record_name,
        "content": args.ip,
        "ttl": 1,  # 1 for auto
        "proxied": args.proxied,
    }

    try:
        if existing_records:
            record_id = existing_records[0]["id"]
            print(f"Record '{full_record_name}' already exists (ID: {record_id}). Updating IP to {args.ip}...")
            update_url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}"
            response = requests.put(update_url, headers=headers, json=payload, timeout=10)
        else:
            print(f"Record '{full_record_name}' does not exist. Creating new record...")
            create_url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
            response = requests.post(create_url, headers=headers, json=payload, timeout=10)

        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            print(f"Successfully {'updated' if existing_records else 'created'} DNS record for '{full_record_name}'.")
            print(json.dumps(result['result'], indent=2))
        else:
            print(f"Error in API response: {result.get('errors')}", file=sys.stderr)
            sys.exit(1)

    except requests.exceptions.RequestException as e:
        print(f"Error during record {'update' if existing_records else 'creation'}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
