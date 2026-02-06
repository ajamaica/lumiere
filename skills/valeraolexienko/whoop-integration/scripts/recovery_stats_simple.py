#!/usr/bin/env python3
"""
WHOOP Recovery Statistics - Simple version
Get recovery data and show last 5 days analysis
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add the scripts directory to path to import whoop_client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from whoop_client import WhoopClient

def main():
    """Get and analyze WHOOP recovery data for last 5 days"""
    client = WhoopClient()
    
    print("🏃‍♀️ **WHOOP Recovery Statistics — Last 5 Days**")
    print("=" * 50)
    print()
    
    # Get recovery data without date filters (gets recent data)
    response = client._make_request('/v2/recovery')
    
    if not response or not response.get('records'):
        print("❌ No recovery data available")
        return
    
    records = response['records']
    
    # Filter for last 5 days and extract key metrics
    from datetime import timezone
    today = datetime.now(timezone.utc)
    five_days_ago = today - timedelta(days=5)
    
    recent_data = []
    
    for record in records:
        # Parse date from created_at (e.g., "2026-02-02T08:42:37.507Z")
        created_date = datetime.fromisoformat(record['created_at'].replace('Z', '+00:00'))
        
        if created_date >= five_days_ago and 'score' in record:
            score = record['score']
            recent_data.append({
                'date': created_date.strftime('%Y-%m-%d'),
                'recovery': score.get('recovery_score', 0),
                'hrv': score.get('hrv_rmssd_milli', 0),
                'rhr': score.get('resting_heart_rate', 0),
                'spo2': score.get('spo2_percentage', 0),
                'temp': score.get('skin_temp_celsius', 0)
            })
    
    if not recent_data:
        print("❌ No recovery data found in the last 5 days")
        return
    
    # Sort by date (newest first) and take last 5
    recent_data.sort(key=lambda x: x['date'], reverse=True)
    last_five = recent_data[:5]
    
    print("📊 **Daily Recovery Breakdown:**")
    for data in last_five:
        recovery = data['recovery']
        recovery_emoji = "🟢" if recovery >= 70 else "🟡" if recovery >= 50 else "🔴"
        
        print(f"{recovery_emoji} **{data['date']}**")
        print(f"   Recovery: **{recovery:.0f}%** | HRV: {data['hrv']:.1f}ms | RHR: {data['rhr']:.0f} bpm")
        print(f"   SpO2: {data['spo2']:.1f}% | Temp: {data['temp']:.1f}°C")
        print()
    
    # Calculate averages
    if last_five:
        avg_recovery = sum(d['recovery'] for d in last_five) / len(last_five)
        avg_hrv = sum(d['hrv'] for d in last_five) / len(last_five)
        avg_rhr = sum(d['rhr'] for d in last_five) / len(last_five)
        
        print("📈 **5-Day Averages:**")
        print(f"🎯 **Average Recovery:** {avg_recovery:.1f}%")
        print(f"💓 **Average HRV:** {avg_hrv:.1f}ms")
        print(f"🫀 **Average RHR:** {avg_rhr:.0f} bpm")
        print()
        
        # Trend analysis
        if len(last_five) >= 2:
            recent_recovery = last_five[0]['recovery']  # Most recent
            older_recovery = last_five[-1]['recovery']  # Oldest in our 5-day window
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
            print(f"Change: {trend_change:+.0f}% over 5 days")
            print()
        
        # Health insights
        print("💡 **Insights:**")
        if avg_recovery >= 70:
            print("✅ **Excellent recovery!** Your body is adapting well to training")
        elif avg_recovery >= 50:
            print("🟡 **Moderate recovery.** Consider optimizing sleep and managing stress")
        else:
            print("🔴 **Low recovery.** Focus on rest, sleep quality, and reduce training intensity")
        
        # HRV insights
        if avg_hrv > 50:
            print("💚 **Good HRV baseline** — strong autonomic nervous system health")
        elif avg_hrv < 35:
            print("🟡 **Lower HRV** — may indicate stress or overtraining")
        
        print()
        print(f"📱 **Data from {len(recent_data)} recovery records in last 5 days**")

if __name__ == "__main__":
    main()