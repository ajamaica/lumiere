"""
Setup cron job for congressional trade data collection
"""
import os
import subprocess
import sys
from pathlib import Path


def setup_cron_job():
    """Set up cron job for congressional data collection"""

    print("🔧 Setting up Congressional Trade Data Collection Cron Job")
    print("="*60)

    # Get project paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    cron_script = script_dir / "run_cron.sh"

    # Make cron script executable
    cron_script.chmod(0o755)
    print(f"✓ Made cron script executable: {cron_script}")

    # Check if cron script exists
    if not cron_script.exists():
        print(f"✗ Cron script not found: {cron_script}")
        return False

    # Get current user's crontab
    try:
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current_crontab = result.stdout
    except subprocess.CalledProcessError:
        # No crontab exists yet
        current_crontab = ""

    # Check if our job already exists
    job_comment = "# Congressional Trade Data Collection"
    job_schedule = "0 9 * * 1-5"  # 9 AM Monday-Friday
    job_command = f"cd {project_root} && {cron_script}"

    if job_comment in current_crontab:
        print("✓ Cron job already exists")
        return True

    # Add new job to crontab
    new_crontab = current_crontab.strip()
    if new_crontab:
        new_crontab += "\n\n"

    new_crontab += f"{job_comment}\n"
    new_crontab += f"{job_schedule} {job_command}\n"

    # Write new crontab
    try:
        process = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
        process.communicate(input=new_crontab)

        if process.returncode == 0:
            print("✓ Cron job added successfully")
            print(f"\n📅 Schedule: {job_schedule} (9 AM Monday-Friday)")
            print(f"📁 Working Directory: {project_root}")
            print(f"📜 Script: {cron_script}")

            # Show current crontab
            print("\n📋 Current Crontab:")
            subprocess.run(["crontab", "-l"])

            return True
        else:
            print("✗ Failed to add cron job")
            return False

    except Exception as e:
        print(f"✗ Error setting up cron job: {e}")
        return False

def remove_cron_job():
    """Remove congressional data collection cron job"""

    print("🗑️  Removing Congressional Trade Data Collection Cron Job")
    print("="*60)

    try:
        # Get current crontab
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current_crontab = result.stdout

        # Remove our job
        lines = current_crontab.split('\n')
        new_lines = []
        skip_next = False

        for line in lines:
            if "# Congressional Trade Data Collection" in line:
                skip_next = True
                continue
            elif skip_next:
                skip_next = False
                continue
            else:
                new_lines.append(line)

        new_crontab = '\n'.join(new_lines).strip()

        # Write updated crontab
        if new_crontab:
            process = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE, text=True)
            process.communicate(input=new_crontab)
        else:
            # Empty crontab
            subprocess.run(["crontab", "-r"])

        print("✓ Cron job removed successfully")
        return True

    except Exception as e:
        print(f"✗ Error removing cron job: {e}")
        return False

def show_cron_status():
    """Show current cron job status"""

    print("📊 Congressional Trade Data Collection Cron Status")
    print("="*60)

    try:
        # Get current crontab
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        current_crontab = result.stdout

        if "# Congressional Trade Data Collection" in current_crontab:
            print("✅ Cron job is ACTIVE")

            # Extract and show our job
            lines = current_crontab.split('\n')
            for i, line in enumerate(lines):
                if "# Congressional Trade Data Collection" in line:
                    print("\n📅 Job Schedule:")
                    print(f"  {lines[i+1] if i+1 < len(lines) else 'Not found'}")
                    break
        else:
            print("❌ Cron job is NOT ACTIVE")

        # Show next run times
        print("\n⏰ Next 5 scheduled runs:")
        subprocess.run(["crontab", "-l"], capture_output=False)

        return True

    except subprocess.CalledProcessError:
        print("❌ No crontab found for current user")
        return False
    except Exception as e:
        print(f"✗ Error checking cron status: {e}")
        return False

def create_systemd_service():
    """Create systemd service for running as a daemon (alternative to cron)"""

    print("🔧 Creating Systemd Service (Alternative to Cron)")
    print("="*60)

    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    main_script = script_dir / "main.py"

    # Create service file content
    service_content = f"""[Unit]
Description=Congressional Trade Data Collection Service
After=network.target

[Service]
Type=simple
User={os.getenv('USER', 'root')}
WorkingDirectory={project_root}
ExecStart={sys.executable} {main_script} run --config ../config/congress_config.json
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=congress-trade-collector

[Install]
WantedBy=multi-user.target
"""

    # Write service file
    service_file = Path.home() / ".config" / "systemd" / "user" / "congress-trade-collector.service"
    service_file.parent.mkdir(parents=True, exist_ok=True)

    with open(service_file, 'w') as f:
        f.write(service_content)

    print(f"✓ Systemd service file created: {service_file}")
    print("\n📋 To use systemd instead of cron:")
    print("  1. systemctl --user daemon-reload")
    print("  2. systemctl --user enable congress-trade-collector.service")
    print("  3. systemctl --user start congress-trade-collector.service")
    print("  4. systemctl --user status congress-trade-collector.service")

    return True

def main():
    """Main entry point for cron setup"""

    import argparse

    parser = argparse.ArgumentParser(description="Setup cron job for congressional trade data collection")
    parser.add_argument("action", choices=["setup", "remove", "status", "systemd"],
                       help="Action to perform")

    args = parser.parse_args()

    if args.action == "setup":
        return setup_cron_job()
    elif args.action == "remove":
        return remove_cron_job()
    elif args.action == "status":
        return show_cron_status()
    elif args.action == "systemd":
        return create_systemd_service()
    else:
        print(f"Unknown action: {args.action}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
