#!/usr/bin/env python3
"""
ClawBack CLI - Fixed version with simplified config path and OpenClaw integration
"""

import argparse
import json
import os
import sys
from pathlib import Path


def get_config_dir():
    """Get the configuration directory - always use ~/.clawback."""
    config_dir = Path.home() / ".clawback"
    config_dir.mkdir(parents=True, exist_ok=True)
    return config_dir


def get_config_path():
    """Get the configuration file path - always ~/.clawback/config.json."""
    return get_config_dir() / "config.json"


def ensure_config_exists():
    """Ensure configuration file exists with defaults."""
    config_path = get_config_path()

    if not config_path.exists():
        print(f"⚠️  Config file not found: {config_path}")
        print("   Creating default configuration...")

        default_config = {
            "broker": {
                "adapter": "etrade",
                "environment": "sandbox",
                "credentials": {
                    "apiKey": "",
                    "apiSecret": ""
                }
            },
            "trading": {
                "accountId": "",
                "initialCapital": 50000,
                "tradeScalePercentage": 0.01,
                "maxPositionPercentage": 0.05,
                "dailyLossLimit": 0.02
            },
            "notifications": {
                "telegram": {
                    "enabled": True,
                    "useOpenClaw": True  # Use OpenClaw's Telegram channel
                }
            },
            "congress": {
                "dataSource": "official",
                "pollIntervalHours": 24,
                "minimumTradeSize": 10000
            }
        }

        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=2)

        print(f"✅ Created default config at {config_path}")
        print("\n📝 Next steps:")
        print("1. Edit the config file with your broker credentials")
        print("2. Run 'clawback setup' to complete setup")
        print("3. Run 'clawback status' to check system status")

    return config_path


def load_config():
    """Load configuration from file."""
    config_path = ensure_config_exists()

    try:
        with open(config_path) as f:
            config = json.load(f)
        return config
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return None


def setup_wizard():
    """Interactive setup wizard."""
    print("\n" + "="*60)
    print("ClawBack Setup Wizard")
    print("="*60)

    config_path = get_config_path()

    if not config_path.exists():
        ensure_config_exists()

    try:
        with open(config_path) as f:
            config = json.load(f)
    except (OSError, FileNotFoundError, json.JSONDecodeError):
        config = {}

    print("\n📋 Current Configuration:")
    print(f"   Config file: {config_path}")
    print(f"   Broker: {config.get('broker', {}).get('adapter', 'Not set')}")
    print(f"   Environment: {config.get('broker', {}).get('environment', 'Not set')}")
    print(f"   Account ID: {config.get('trading', {}).get('accountId', 'Not set')}")

    print("\n🔧 Setup Options:")
    print("1. Configure broker credentials")
    print("2. Test Telegram notifications")
    print("3. Check system status")
    print("4. Exit setup")

    try:
        choice = input("\nSelect option (1-4): ").strip()

        if choice == '1':
            print("\n📝 Broker Configuration")
            print("-" * 40)

            # Get broker type
            broker = input("Broker type (etrade/schwab/fidelity) [etrade]: ").strip() or "etrade"

            # Get environment
            env = input("Environment (sandbox/production) [sandbox]: ").strip() or "sandbox"

            # Get API key
            api_key = input("API Key (leave empty to keep current): ").strip()

            # Get API secret
            api_secret = input("API Secret (leave empty to keep current): ").strip()

            # Get account ID
            account_id = input("Account ID (leave empty to keep current): ").strip()

            # Update config
            if not config:
                config = {}

            config.setdefault('broker', {})
            config['broker']['adapter'] = broker
            config['broker']['environment'] = env

            if api_key:
                config['broker'].setdefault('credentials', {})
                config['broker']['credentials']['apiKey'] = api_key

            if api_secret:
                config['broker'].setdefault('credentials', {})
                config['broker']['credentials']['apiSecret'] = api_secret

            if account_id:
                config.setdefault('trading', {})
                config['trading']['accountId'] = account_id

            # Save config
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)

            print(f"\n✅ Configuration saved to {config_path}")

        elif choice == '2':
            print("\n📱 Testing Telegram Notifications...")

            # Check if OpenClaw Telegram is configured
            openclaw_config_path = Path.home() / ".openclaw" / "openclaw.json"
            if openclaw_config_path.exists():
                try:
                    with open(openclaw_config_path) as f:
                        openclaw_config = json.load(f)

                    telegram_config = openclaw_config.get('channels', {}).get('telegram', {})
                    if telegram_config.get('botToken'):
                        print("✅ OpenClaw Telegram channel is configured")
                        print(f"   Bot token: {telegram_config.get('botToken')[:10]}...")

                        # Update config to use OpenClaw Telegram
                        config.setdefault('notifications', {})
                        config['notifications'].setdefault('telegram', {})
                        config['notifications']['telegram']['enabled'] = True
                        config['notifications']['telegram']['useOpenClaw'] = True

                        with open(config_path, 'w') as f:
                            json.dump(config, f, indent=2)

                        print("✅ Configured to use OpenClaw Telegram channel")
                    else:
                        print("⚠️  OpenClaw Telegram not fully configured")
                        print("   Run: openclaw config set channels.telegram.botToken YOUR_TOKEN")
                except Exception as e:
                    print(f"⚠️  Error checking OpenClaw config: {e}")
            else:
                print("⚠️  OpenClaw config not found")
                print("   Configure Telegram in ~/.openclaw/openclaw.json")

        elif choice == '3':
            print("\n📊 System Status Check")
            check_status()

        elif choice == '4':
            print("\n👋 Setup complete!")
            return

        else:
            print("❌ Invalid choice")

    except KeyboardInterrupt:
        print("\n\n👋 Setup cancelled")
        return

    print("\n" + "="*60)
    print("Setup Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Run 'clawback status' to verify configuration")
    print("2. Run 'clawback run' to start trading")
    print("3. Run 'clawback daemon' for background operation")


def check_status():
    """Check system status."""
    print("\n📊 CLAWBACK STATUS")
    print("="*60)

    config_path = get_config_path()
    print(f"Config file: {config_path}")

    if not config_path.exists():
        print("❌ Config file not found")
        return

    try:
        with open(config_path) as f:
            config = json.load(f)

        print("\n🔧 Configuration:")
        print(f"   Broker: {config.get('broker', {}).get('adapter', 'Not set')}")
        print(f"   Environment: {config.get('broker', {}).get('environment', 'Not set')}")
        print(f"   Account ID: {config.get('trading', {}).get('accountId', 'Not set')}")

        telegram_config = config.get('notifications', {}).get('telegram', {})
        if telegram_config.get('enabled'):
            if telegram_config.get('useOpenClaw'):
                print("   Telegram: ENABLED (using OpenClaw channel)")
            else:
                print("   Telegram: ENABLED (standalone)")
        else:
            print("   Telegram: DISABLED")

        print("\n📁 Directories:")
        config_dir = Path.home() / ".clawback"
        print(f"   Config: {config_dir}")
        print(f"   Data: {config_dir / 'data'}")

        print("\n✅ System appears to be configured correctly")
        print("\n💡 Run 'clawback run' to start trading")

    except Exception as e:
        print(f"❌ Error checking status: {e}")


def run_trading():
    """Run the trading bot."""
    print("\n🚀 STARTING TRADING BOT")
    print("="*60)

    config = load_config()
    if not config:
        return

    print(f"Broker: {config.get('broker', {}).get('adapter', 'Unknown')}")
    print(f"Account: {config.get('trading', {}).get('accountId', 'Unknown')}")
    print(f"Environment: {config.get('broker', {}).get('environment', 'Unknown')}")

    print("\n📈 Trading bot starting...")
    print("Press Ctrl+C to stop")

    # Import and run the actual trading bot
    try:
        # Add current directory to path
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

        from clawback.main import TradingBot

        bot = TradingBot(str(get_config_path()))
        bot.interactive_mode()

    except ImportError as e:
        print(f"❌ Error importing trading bot: {e}")
        print("\n💡 Try running: pip install -e .")
    except Exception as e:
        print(f"❌ Error running trading bot: {e}")
        import traceback
        traceback.print_exc()


def run_daemon():
    """Run as daemon."""
    print("\n👻 STARTING DAEMON MODE")
    print("="*60)
    print("Daemon mode not yet implemented")
    print("Use 'clawback run' for interactive mode")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="ClawBack - Congressional Trade Mirror Bot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  clawback setup          Run setup wizard
  clawback status         Check system status
  clawback run            Start trading bot
  clawback daemon         Run in background mode
        """
    )

    parser.add_argument(
        'command',
        nargs='?',
        default='status',
        choices=['setup', 'status', 'run', 'daemon', 'help'],
        help='Command to execute'
    )

    args = parser.parse_args()

    if args.command == 'setup':
        setup_wizard()
    elif args.command == 'status':
        check_status()
    elif args.command == 'run':
        run_trading()
    elif args.command == 'daemon':
        run_daemon()
    elif args.command == 'help':
        parser.print_help()
    else:
        check_status()


if __name__ == "__main__":
    main()
