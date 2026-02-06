#!/usr/bin/env python3
"""
WHOOP Recovery Statistics - Fixed version with proper date handling
Get recovery data by unique days
"""

import sys
import os
import json
from datetime import datetime, timezone
from collections import defaultdict

# Add the scripts directory to path to import whoop_client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from whoop_client import WhoopClient

def main():
    """Get and analyze WHOOP recovery data for last 5 unique days"""
    client = WhoopClient()
    
    print("🏃‍♀️ **WHOOP Recovery Statistics — Last 5 Days**")
    print("=" * 50)
    print()
    
    # Get recovery data without date filters
    response = client._make_request('/v2/recovery')
    
    if not response or not response.get('records'):
        print("❌ No recovery data available")
        return
    
    records = response['records']
    
    # Group records by date (take the latest/best record per day)
    daily_records = defaultdict(list)
    
    for record in records:
        if 'score' in record:
            # Parse date from created_at
            created_date = datetime.fromisoformat(record['created_at'].replace('Z', '+00:00'))
            date_str = created_date.strftime('%Y-%m-%d')
            
            score = record['score']
            daily_records[date_str].append({
                'created_at': record['created_at'],
                'recovery': score.get('recovery_score', 0),
                'hrv': score.get('hrv_rmssd_milli', 0),
                'rhr': score.get('resting_heart_rate', 0),
                'spo2': score.get('spo2_percentage', 0),
                'temp': score.get('skin_temp_celsius', 0)
            })
    
    # Take best recovery score per day and sort by date
    daily_best = {}
    for date_str, day_records in daily_records.items():
        # Take the record with highest recovery score for that day
        best_record = max(day_records, key=lambda x: x['recovery'])
        daily_best[date_str] = best_record
    
    # Sort by date (newest first) and take last 5 days
    sorted_days = sorted(daily_best.keys(), reverse=True)[:5]
    
    if not sorted_days:
        print("❌ No recovery data found")
        return
    
    print("📊 **Daily Recovery Breakdown (Best Score Per Day):**")
    daily_data = []
    
    for date_str in sorted_days:
        data = daily_best[date_str]
        recovery = data['recovery']
        recovery_emoji = "🟢" if recovery >= 70 else "🟡" if recovery >= 50 else "🔴"
        
        print(f"{recovery_emoji} **{date_str}**")
        print(f"   Recovery: **{recovery:.0f}%** | HRV: {data['hrv']:.1f}ms | RHR: {data['rhr']:.0f} bpm")
        print(f"   SpO2: {data['spo2']:.1f}% | Temp: {data['temp']:.1f}°C")
        print()
        
        daily_data.append(data)
    
    # Calculate averages
    if daily_data:
        avg_recovery = sum(d['recovery'] for d in daily_data) / len(daily_data)
        avg_hrv = sum(d['hrv'] for d in daily_data) / len(daily_data)
        avg_rhr = sum(d['rhr'] for d in daily_data) / len(daily_data)
        
        print("📈 **5-Day Averages:**")
        print(f"🎯 **Average Recovery:** {avg_recovery:.1f}%")
        print(f"💓 **Average HRV:** {avg_hrv:.1f}ms")
        print(f"🫀 **Average RHR:** {avg_rhr:.0f} bpm")
        print()
        
        # Trend analysis (newest vs oldest in our 5-day window)
        if len(daily_data) >= 2:
            recent_recovery = daily_data[0]['recovery']  # Most recent day
            older_recovery = daily_data[-1]['recovery']  # Oldest day in our window
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
            print(f"Change: {trend_change:+.0f}% ({sorted_days[-1]} → {sorted_days[0]})")
            print()
        
        # Health insights
        print("💡 **Insights:**")
        if avg_recovery >= 70:
            print("✅ **Excellent recovery!** Your body is adapting well")
        elif avg_recovery >= 50:
            print("🟡 **Moderate recovery.** Focus on sleep optimization and stress management")
        else:
            print("🔴 **Low recovery detected.** Prioritize rest and reduce training intensity")
        
        # HRV insights
        if avg_hrv > 50:
            print("💚 **Strong HRV baseline** — excellent autonomic nervous system health")
        elif avg_hrv < 35:
            print("🟡 **Lower HRV** — may indicate stress or overtraining")
        
        print()
        
        # Show how many records per day
        records_per_day = {}
        for date_str in sorted_days:
            records_per_day[date_str] = len(daily_records[date_str])
        
        print("📱 **Records per day:**")
        for date_str in sorted_days:
            count = records_per_day[date_str]
            print(f"   {date_str}: {count} recovery record{'s' if count > 1 else ''}")

if __name__ == "__main__":
    main()