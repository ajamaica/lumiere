#!/usr/bin/env python3
"""
WHOOP Recovery Statistics - Correct version using cycle-specific recovery
Matches exactly what WHOOP app shows
"""

import sys
import os
from datetime import datetime, timezone

# Add the scripts directory to path to import whoop_client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from whoop_client import WhoopClient

def main():
    """Get and analyze WHOOP recovery data using proper cycle-based approach"""
    client = WhoopClient()
    
    print("🏃‍♀️ **WHOOP Recovery Statistics (App-Accurate)**")
    print("=" * 55)
    print()
    
    # Get cycles data
    cycles_response = client._make_request('/v1/cycle', {'limit': 10})
    
    if not cycles_response or not cycles_response.get('records'):
        print("❌ No cycle data available")
        return
    
    cycles = cycles_response['records']
    daily_recovery = []
    
    print("📊 **Daily Recovery Breakdown:**")
    
    for cycle in cycles:
        cycle_id = cycle['id']
        start = cycle['start']
        end = cycle.get('end')
        
        # Skip current/ongoing cycle (no recovery data yet)
        if not end:
            # Try to get latest recovery from general endpoint for current day
            recovery_response = client._make_request('/v2/recovery', {'limit': 1})
            if recovery_response and recovery_response.get('records'):
                latest = recovery_response['records'][0]
                if 'score' in latest:
                    recovery = latest['score'].get('recovery_score', 0)
                    hrv = latest['score'].get('hrv_rmssd_milli', 0)
                    rhr = latest['score'].get('resting_heart_rate', 0)
                    
                    # Parse date
                    start_date = datetime.fromisoformat(start.replace('Z', '+00:00'))
                    # Since cycle starts at night, the "day" is actually the next day
                    actual_date = start_date.replace(hour=12)  # Noon of the cycle day
                    if start_date.hour >= 20:  # If starts after 8 PM, it's for next day
                        actual_date = actual_date.replace(day=actual_date.day + 1)
                    
                    date_str = actual_date.strftime('%a %d %b')
                    recovery_emoji = "🟢" if recovery >= 70 else "🟡" if recovery >= 50 else "🔴"
                    
                    print(f"{recovery_emoji} **{date_str}** (ongoing)")
                    print(f"   Recovery: **{recovery:.0f}%** | HRV: {hrv:.1f}ms | RHR: {rhr:.0f} bpm")
                    print()
                    
                    daily_recovery.append({
                        'date': date_str,
                        'recovery': recovery,
                        'hrv': hrv,
                        'rhr': rhr
                    })
            continue
        
        # Get recovery for completed cycle
        recovery_response = client._make_request(f'/v2/cycle/{cycle_id}/recovery')
        
        if recovery_response and 'score' in recovery_response:
            score = recovery_response['score']
            recovery = score.get('recovery_score', 0)
            hrv = score.get('hrv_rmssd_milli', 0)
            rhr = score.get('resting_heart_rate', 0)
            
            # Parse cycle date (cycles typically start at night for the next day)
            start_date = datetime.fromisoformat(start.replace('Z', '+00:00'))
            
            # If cycle starts after 8 PM, it's for the next calendar day
            if start_date.hour >= 20:
                actual_date = start_date.replace(day=start_date.day + 1, hour=12)
            else:
                actual_date = start_date.replace(hour=12)
            
            date_str = actual_date.strftime('%a %d %b')
            recovery_emoji = "🟢" if recovery >= 70 else "🟡" if recovery >= 50 else "🔴"
            
            print(f"{recovery_emoji} **{date_str}**")
            print(f"   Recovery: **{recovery:.0f}%** | HRV: {hrv:.1f}ms | RHR: {rhr:.0f} bpm")
            print()
            
            daily_recovery.append({
                'date': date_str,
                'recovery': recovery,
                'hrv': hrv,
                'rhr': rhr
            })
        
        # Limit to last 6 days of data
        if len(daily_recovery) >= 6:
            break
    
    if not daily_recovery:
        print("❌ No recovery data found")
        return
    
    # Take last 5 days for analysis
    recent_data = daily_recovery[:5]
    
    # Calculate averages
    avg_recovery = sum(d['recovery'] for d in recent_data) / len(recent_data)
    avg_hrv = sum(d['hrv'] for d in recent_data) / len(recent_data)
    avg_rhr = sum(d['rhr'] for d in recent_data) / len(recent_data)
    
    print("📈 **5-Day Averages:**")
    print(f"🎯 **Average Recovery:** {avg_recovery:.1f}%")
    print(f"💓 **Average HRV:** {avg_hrv:.1f}ms")
    print(f"🫀 **Average RHR:** {avg_rhr:.0f} bpm")
    print()
    
    # Trend analysis
    if len(recent_data) >= 2:
        recent_recovery = recent_data[0]['recovery']  # Most recent
        older_recovery = recent_data[-1]['recovery']  # Oldest in our window
        trend_change = recent_recovery - older_recovery
        
        if trend_change > 5:
            trend_emoji = "📈"
            trend_text = "**improving**"
        elif trend_change < -5:
            trend_emoji = "📉" 
            trend_text = "**declining**"
        else:
            trend_emoji = "➡️"
            trend_text = "**stable**"
        
        print("📊 **Trend Analysis:**")
        print(f"{trend_emoji} Recovery trend: {trend_text}")
        print(f"Change: {trend_change:+.0f}% over period")
        print()
    
    # Health insights
    print("💡 **Insights:**")
    if avg_recovery >= 70:
        print("✅ **Excellent recovery!** Your body is handling training load well")
    elif avg_recovery >= 50:
        print("🟡 **Moderate recovery.** Consider optimizing sleep and managing stress")
    else:
        print("🔴 **Low recovery.** Focus on rest and reduce training intensity")
    
    # HRV insights
    if avg_hrv > 50:
        print("💚 **Strong HRV baseline** — excellent autonomic health")
    elif avg_hrv < 35:
        print("🟡 **Lower HRV** — may indicate stress or overtraining")
    
    print()
    print(f"📱 **Data source:** Cycle-specific recovery (matches WHOOP app)")

if __name__ == "__main__":
    main()