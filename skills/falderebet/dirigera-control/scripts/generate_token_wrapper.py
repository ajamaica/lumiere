#!/usr/bin/env python3
"""
Wrapper for generate-token that automatically waits for button press and saves output.

This script starts the token generation process and automatically waits for the
button press on the Dirigera hub, then saves the token to a file.

Usage:
  python scripts/generate_token_wrapper.py <dirigera-ip-address>
  python scripts/generate_token_wrapper.py <dirigera-ip-address> --output /path/to/token.txt
"""
import argparse
import sys
import time
from pathlib import Path

try:
    import requests
    from requests.packages.urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
except ImportError:
    print("Error: requests library not found. Install with: pip install requests")
    sys.exit(1)


def generate_token(ip_address: str, timeout: int = 120) -> str:
    """
    Generate a token by waiting for the button press on the Dirigera hub.

    This function will keep trying until the button is pressed or timeout is reached.
    Uses the correct OAuth PKCE flow with code challenge.
    """
    import hashlib
    import base64
    import string
    import random
    import socket

    # Generate a code verifier (128 chars as per dirigera library)
    alphabet = f"_-~.{string.ascii_letters}{string.digits}"
    code_verifier = "".join(random.choice(alphabet) for _ in range(128))

    # Create code challenge (SHA256 hash of verifier)
    sha256_hash = hashlib.sha256()
    sha256_hash.update(code_verifier.encode())
    digest = sha256_hash.digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("us-ascii")

    # Step 1: Get authorization code
    print(f"Connecting to Dirigera hub at {ip_address}...")
    auth_url = f"https://{ip_address}:8443/v1/oauth/authorize"
    params = {
        "audience": "homesmart.local",
        "response_type": "code",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    try:
        response = requests.get(auth_url, params=params, verify=False, timeout=10)
        response.raise_for_status()
        auth_code = response.json()["code"]
        print(f"✓ Authorization code received")
    except Exception as e:
        print(f"✗ Failed to get authorization code: {e}")
        return None

    # Step 2: Wait for button press and get token
    print(f"\nWaiting for button press on Dirigera hub at {ip_address}...")
    print(f"Timeout: {timeout} seconds")
    print()

    token_url = f"https://{ip_address}:8443/v1/oauth/token"
    data = (
        f"code={auth_code}"
        f"&name={socket.gethostname()}"
        f"&grant_type=authorization_code"
        f"&code_verifier={code_verifier}"
    )
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    start_time = time.time()
    attempt = 0

    while time.time() - start_time < timeout:
        attempt += 1
        try:
            response = requests.post(
                token_url,
                headers=headers,
                data=data,
                verify=False,
                timeout=5
            )

            if response.status_code == 200:
                token_data = response.json()
                if "access_token" in token_data:
                    print(f"\n✓ Token generated successfully after {attempt} attempts!")
                    return token_data["access_token"]

            # If we get a 4xx error, the button hasn't been pressed yet
            if response.status_code in [400, 401, 403]:
                elapsed = int(time.time() - start_time)
                remaining = timeout - elapsed
                print(f"\rWaiting... ({elapsed}s elapsed, {remaining}s remaining)", end="", flush=True)
                time.sleep(2)
                continue

            # Other errors
            print(f"\nUnexpected response: {response.status_code}")
            print(response.text)
            time.sleep(2)

        except requests.exceptions.Timeout:
            print(f"\rConnection timeout, retrying... ({int(time.time() - start_time)}s)", end="", flush=True)
            time.sleep(1)
        except requests.exceptions.ConnectionError as e:
            print(f"\nConnection error: {e}")
            print("Make sure the hub IP is correct and the hub is powered on.")
            return None
        except Exception as e:
            print(f"\nError: {e}")
            time.sleep(2)

    print(f"\n\nTimeout reached after {timeout} seconds.")
    print("The button was not pressed in time.")
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate Dirigera token and save to file (auto-waits for button press)"
    )
    parser.add_argument("ip_address", help="Dirigera hub IP address")
    parser.add_argument(
        "--output",
        default="dirigera_token.txt",
        help="Output file path (default: dirigera_token.txt in current directory)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Timeout in seconds to wait for button press (default: 120)",
    )
    args = parser.parse_args()

    output_path = Path(args.output)

    print("=" * 60)
    print("DIRIGERA TOKEN GENERATION")
    print("=" * 60)
    print(f"\nHub IP: {args.ip_address}")
    print(f"Output file: {output_path.absolute()}")
    print("\n" + "=" * 60)
    print("NEXT STEP: Press the ACTION BUTTON on the bottom of your")
    print("Dirigera hub within the next 120 seconds.")
    print("=" * 60)
    print()

    token = generate_token(args.ip_address, timeout=args.timeout)

    if not token:
        print("\nFailed to generate token.")
        return 1

    # Save to file
    output_path.write_text(token + "\n")
    print(f"\n✓ Token saved to: {output_path.absolute()}")
    print(f"\nTo use this token:")
    print(f'  In Python: token = Path("{output_path}").read_text().strip()')

    return 0


if __name__ == "__main__":
    sys.exit(main())
