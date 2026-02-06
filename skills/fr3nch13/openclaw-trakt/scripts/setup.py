#!/usr/bin/env python3
"""
Interactive setup wizard for openclaw-trakt skill
Can be run by OpenClaw or by users directly
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'

CONFIG_FILE = Path.home() / ".openclaw" / "trakt_config.json"
SCRIPT_DIR = Path(__file__).parent
CLIENT_SCRIPT = SCRIPT_DIR / "trakt_client.py"


def print_step(step_num, title):
    """Print a step header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Step {step_num}: {title}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_success(message):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")


def print_error(message):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")


def print_info(message):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")


def check_dependencies():
    """Check if required dependencies are installed"""
    print_step(1, "Checking Dependencies")
    
    try:
        import requests
        print_success("Python 'requests' library is installed")
        return True
    except ImportError:
        print_error("Python 'requests' library not found")
        print_info("Installing requests...")
        
        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install", 
                "requests", "--break-system-packages"
            ], check=True, capture_output=True)
            print_success("Installed 'requests' successfully")
            return True
        except subprocess.CalledProcessError:
            print_error("Failed to install 'requests'")
            print_info("Please install manually: pip3 install requests --break-system-packages")
            return False


def create_trakt_app():
    """Guide user to create Trakt application"""
    print_step(2, "Create Trakt Application")
    
    print("I'll open the Trakt applications page in your browser.")
    print("\nPlease:")
    print("  1. Click 'New Application'")
    print("  2. Fill in these fields:")
    print(f"     - {YELLOW}Name:{RESET} OpenClaw Assistant")
    print(f"     - {YELLOW}Description:{RESET} Personal AI assistant integration")
    print(f"     - {YELLOW}Redirect URI:{RESET} urn:ietf:wg:oauth:2.0:oob")
    print("  3. Check the permissions you want (recommend all)")
    print("  4. Click 'Save App'\n")
    
    # Open browser
    url = "https://trakt.tv/oauth/applications"
    try:
        if sys.platform == 'darwin':
            subprocess.run(['open', url], check=False)
        elif sys.platform == 'linux':
            subprocess.run(['xdg-open', url], check=False)
        elif sys.platform == 'win32':
            subprocess.run(['start', url], shell=True, check=False)
        print_success(f"Opened {url}")
    except Exception as e:
        print_info(f"Please visit: {url}")
    
    input(f"\n{YELLOW}Press Enter when you've created the application...{RESET}")


def collect_credentials():
    """Collect Client ID and Secret from user"""
    print_step(3, "Collect Credentials")
    
    print("Now I need your Trakt application credentials.\n")
    
    client_id = input(f"{YELLOW}Client ID:{RESET} ").strip()
    if not client_id:
        print_error("Client ID cannot be empty")
        return None, None
    
    client_secret = input(f"{YELLOW}Client Secret:{RESET} ").strip()
    if not client_secret:
        print_error("Client Secret cannot be empty")
        return None, None
    
    return client_id, client_secret


def create_config_file(client_id, client_secret):
    """Create configuration file"""
    print_step(4, "Create Configuration File")
    
    config = {
        "client_id": client_id,
        "client_secret": client_secret,
        "access_token": "",
        "refresh_token": ""
    }
    
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        print_success(f"Configuration saved to {CONFIG_FILE}")
        return True
    except Exception as e:
        print_error(f"Failed to create config file: {e}")
        return False


def authenticate():
    """Run authentication flow"""
    print_step(5, "Authenticate with Trakt")
    
    print("Getting PIN URL...")
    
    # Run auth command to get PIN URL
    try:
        result = subprocess.run(
            [sys.executable, str(CLIENT_SCRIPT), "auth"],
            capture_output=True,
            text=True
        )
        
        # Extract PIN URL from output
        pin_url = None
        for line in result.stdout.split('\n'):
            if 'https://trakt.tv/pin/' in line:
                pin_url = line.strip()
                break
        
        if not pin_url:
            print_error("Could not get PIN URL")
            return False
        
        print(f"\n{YELLOW}PIN URL:{RESET} {pin_url}\n")
        
        # Open browser to PIN URL
        try:
            if sys.platform == 'darwin':
                subprocess.run(['open', pin_url], check=False)
            elif sys.platform == 'linux':
                subprocess.run(['xdg-open', pin_url], check=False)
            elif sys.platform == 'win32':
                subprocess.run(['start', pin_url], shell=True, check=False)
            print_success(f"Opened {pin_url}")
        except:
            print_info(f"Please visit: {pin_url}")
        
        print("\nPlease:")
        print("  1. Log in to Trakt if prompted")
        print("  2. Click 'Authorize' or 'Yes'")
        print("  3. Copy the PIN code\n")
        
        pin = input(f"{YELLOW}Enter PIN:{RESET} ").strip()
        
        if not pin:
            print_error("PIN cannot be empty")
            return False
        
        # Run auth with PIN
        print("\nAuthenticating...")
        result = subprocess.run(
            [sys.executable, str(CLIENT_SCRIPT), "auth", pin],
            capture_output=True,
            text=True
        )
        
        if "successful" in result.stdout.lower():
            print_success("Authentication successful!")
            return True
        else:
            print_error("Authentication failed")
            print(result.stdout)
            print(result.stderr)
            return False
            
    except Exception as e:
        print_error(f"Authentication error: {e}")
        return False


def test_integration():
    """Test the integration"""
    print_step(6, "Test Integration")
    
    print("Fetching recommendations to test the setup...\n")
    
    try:
        result = subprocess.run(
            [sys.executable, str(CLIENT_SCRIPT), "recommend"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                if data and len(data) > 0:
                    print_success("Integration is working!")
                    print(f"\n{YELLOW}Sample recommendations:{RESET}")
                    for i, item in enumerate(data[:3], 1):
                        title = item.get('title', 'Unknown')
                        year = item.get('year', '')
                        print(f"  {i}. {title} ({year})")
                    return True
                else:
                    print_info("No recommendations yet (this is normal for new accounts)")
                    print_info("Try rating some shows on Trakt to get personalized recommendations")
                    return True
            except json.JSONDecodeError:
                print_error("Could not parse recommendations")
                return False
        else:
            print_error("Test failed")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print_error("Test timed out")
        return False
    except Exception as e:
        print_error(f"Test error: {e}")
        return False


def main():
    """Main setup flow"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}  OpenClaw Trakt Integration - Setup Wizard{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Step 1: Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Step 2: Create Trakt app
    create_trakt_app()
    
    # Step 3: Collect credentials
    client_id, client_secret = collect_credentials()
    if not client_id or not client_secret:
        sys.exit(1)
    
    # Step 4: Create config file
    if not create_config_file(client_id, client_secret):
        sys.exit(1)
    
    # Step 5: Authenticate
    if not authenticate():
        print_error("\nSetup failed at authentication step")
        print_info("You can retry by running this script again")
        sys.exit(1)
    
    # Step 6: Test
    if not test_integration():
        print_info("\nSetup completed but test failed")
        print_info("You may need to rate some shows on Trakt first")
    
    # Success!
    print(f"\n{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}  🎬 Setup Complete! 🎉{RESET}")
    print(f"{GREEN}{'='*60}{RESET}\n")
    
    print("You can now ask your OpenClaw assistant:")
    print("  • 'What should I watch?'")
    print("  • 'What have I been watching lately?'")
    print("  • 'What's trending?'")
    print("  • 'Search for Breaking Bad'\n")
    
    print(f"{YELLOW}Tip:{RESET} Rate shows on Trakt.tv to improve recommendations!")
    print(f"{YELLOW}Pro:{RESET} Connect streaming services for automatic watch tracking\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Setup cancelled by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)
