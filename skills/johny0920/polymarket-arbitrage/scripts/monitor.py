#!/usr/bin/env python3
"""
Continuous monitoring for Polymarket arbitrage opportunities.

Usage:
    python monitor.py [--interval 300] [--min-edge 3.0] [--alert-webhook URL]

Features:
    - Continuous market scanning
    - Arbitrage detection
    - Alerts for new opportunities
    - Persistence of results
"""

import json
import time
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path


def run_command(cmd, description=""):
    """Run a shell command and return the output."""
    if description:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {description}", file=sys.stderr)
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            print(f"Error: {result.stderr}", file=sys.stderr)
            return None
        
        return result.stdout
    except subprocess.TimeoutExpired:
        print(f"Timeout running: {cmd}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Exception: {e}", file=sys.stderr)
        return None


def load_json_file(filepath):
    """Load JSON file safely."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}", file=sys.stderr)
        return None


def save_alert_state(filepath, arb_ids):
    """Save alerted arbitrage IDs to avoid duplicate alerts."""
    try:
        with open(filepath, 'w') as f:
            json.dump({'alerted_ids': list(arb_ids), 'updated_at': datetime.utcnow().isoformat()}, f)
    except Exception as e:
        print(f"Error saving alert state: {e}", file=sys.stderr)


def load_alert_state(filepath):
    """Load previously alerted arbitrage IDs."""
    if not Path(filepath).exists():
        return set()
    
    data = load_json_file(filepath)
    if data:
        return set(data.get('alerted_ids', []))
    return set()


def send_alert(arb, webhook_url=None):
    """Send alert for arbitrage opportunity."""
    message = f"""
🚨 ARBITRAGE OPPORTUNITY DETECTED

{arb['title'][:80]}

Type: {arb['type']}
Net Profit: {arb['net_profit_pct']:.2f}% (after fees)
Volume: ${arb['volume']:,}
Risk Score: {arb['risk_score']}/100

Action: {arb['action']}

URL: {arb['url']}

Probabilities: {arb['probabilities']}
Sum: {arb['prob_sum']}%
"""
    
    print(message, file=sys.stderr)
    
    # TODO: Implement webhook alerts (Telegram, Discord, etc.)
    if webhook_url:
        print(f"[ALERT] Would send to webhook: {webhook_url}", file=sys.stderr)


def monitor_loop(interval, min_edge, alert_webhook, data_dir):
    """Main monitoring loop."""
    data_dir = Path(data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    
    markets_file = data_dir / 'markets.json'
    arbs_file = data_dir / 'arbs.json'
    alert_state_file = data_dir / 'alert_state.json'
    
    alerted_ids = load_alert_state(alert_state_file)
    
    print(f"Starting Polymarket arbitrage monitor", file=sys.stderr)
    print(f"  Interval: {interval}s", file=sys.stderr)
    print(f"  Min Edge: {min_edge}%", file=sys.stderr)
    print(f"  Data Dir: {data_dir}", file=sys.stderr)
    print(f"  Previously alerted: {len(alerted_ids)} opportunities", file=sys.stderr)
    print("", file=sys.stderr)
    
    iteration = 0
    
    while True:
        iteration += 1
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"[{timestamp}] Iteration #{iteration}", file=sys.stderr)
        print(f"{'='*60}", file=sys.stderr)
        
        # Step 1: Fetch markets
        script_dir = Path(__file__).parent
        fetch_cmd = f"python3 {script_dir}/fetch_markets.py --output {markets_file} --min-volume 50000"
        run_command(fetch_cmd, "Fetching markets...")
        
        # Step 2: Detect arbitrage
        detect_cmd = f"python3 {script_dir}/detect_arbitrage.py {markets_file} --min-edge {min_edge} --output {arbs_file}"
        run_command(detect_cmd, "Detecting arbitrage...")
        
        # Step 3: Load results
        arbs_data = load_json_file(arbs_file)
        
        if arbs_data:
            arbs = arbs_data.get('arbitrages', [])
            
            print(f"\nFound {len(arbs)} arbitrage opportunities", file=sys.stderr)
            
            # Check for new opportunities
            new_arbs = []
            for arb in arbs:
                arb_id = f"{arb['market_id']}_{arb['type']}"
                if arb_id not in alerted_ids:
                    new_arbs.append(arb)
                    alerted_ids.add(arb_id)
            
            if new_arbs:
                print(f"\n🔔 {len(new_arbs)} NEW opportunities!", file=sys.stderr)
                for arb in new_arbs:
                    send_alert(arb, alert_webhook)
                
                # Save alert state
                save_alert_state(alert_state_file, alerted_ids)
            else:
                print("No new opportunities (all previously seen)", file=sys.stderr)
        
        # Wait for next iteration
        print(f"\nSleeping for {interval}s...", file=sys.stderr)
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description='Monitor Polymarket for arbitrage')
    parser.add_argument('--interval', type=int, default=300, 
                        help='Scan interval in seconds (default: 300)')
    parser.add_argument('--min-edge', type=float, default=3.0, 
                        help='Minimum edge percentage (default: 3.0)')
    parser.add_argument('--alert-webhook', type=str, 
                        help='Webhook URL for alerts')
    parser.add_argument('--data-dir', default='./polymarket_data', 
                        help='Directory for data files (default: ./polymarket_data)')
    parser.add_argument('--once', action='store_true', 
                        help='Run once and exit (no loop)')
    
    args = parser.parse_args()
    
    if args.once:
        # Single run mode (for testing)
        data_dir = Path(args.data_dir)
        data_dir.mkdir(parents=True, exist_ok=True)
        
        script_dir = Path(__file__).parent
        markets_file = data_dir / 'markets.json'
        arbs_file = data_dir / 'arbs.json'
        
        run_command(f"python3 {script_dir}/fetch_markets.py --output {markets_file}")
        run_command(f"python3 {script_dir}/detect_arbitrage.py {markets_file} --min-edge {args.min_edge} --output {arbs_file}")
        
        arbs_data = load_json_file(arbs_file)
        if arbs_data:
            print(json.dumps(arbs_data, indent=2))
    else:
        # Continuous monitoring
        try:
            monitor_loop(args.interval, args.min_edge, args.alert_webhook, args.data_dir)
        except KeyboardInterrupt:
            print("\n\nMonitoring stopped by user", file=sys.stderr)
            sys.exit(0)


if __name__ == '__main__':
    main()
