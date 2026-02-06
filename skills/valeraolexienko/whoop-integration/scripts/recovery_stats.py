#!/usr/bin/env python3
"""
WHOOP Recovery Statistics
Get recovery data for last 5 days with detailed analysis
"""

import sys
import os
from datetime import datetime, timedelta

# Add the scripts directory to path to import whoop_client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from whoop_client import WhoopClient

def get_recovery_history(days=5):
    """Get recovery data for the last N days"""
    client = WhoopClient()
    
    end_time = datetime.now().isoformat() + 'Z'
    start_time = (datetime.now() - timedelta(days=days)).isoformat() + 'Z'
    
    params = {
        'start': start_time,
        'end': end_time,
        'limit': 50  # Get more records to ensure we have enough
    }
    
    response = client._make_request('/v2/recovery', params)
    
    if response and response.get('records'):
        return response['records']
    
    return []

def analyze_recovery_trends(records):
    """Analyze recovery trends and provide insights"""
    if not records:
        return "No recovery data available"
    
    # Sort by creation date (newest first)
    sorted_records = sorted(records, key=lambda x: x['created_at'], reverse=True)
    
    # Take last 5 records
    recent_records = sorted_records[:5]
    
    recovery_scores = []
    hrv_values = []
    rhr_values = []
    dates = []
    
    for record in recent_records:
        if 'score' in record:
            score_data = record['score']
            recovery_scores.append(score_data.get('recovery_score', 0))
            hrv_values.append(score_data.get('hrv_rmssd_milli', 0))
            rhr_values.append(score_data.get('resting_heart_rate', 0))
            
            # Extract date from created_at
            date_str = record['created_at'][:10]  # YYYY-MM-DD
            dates.append(date_str)
    
    if not recovery_scores:
        return "No recovery scores found in recent data"
    
    # Calculate trends
    avg_recovery = sum(recovery_scores) / len(recovery_scores)
    avg_hrv = sum(hrv_values) / len(hrv_values) if hrv_values else 0
    avg_rhr = sum(rhr_values) / len(rhr_values) if rhr_values else 0
    
    # Trend analysis
    if len(recovery_scores) >= 2:
        recent_trend = recovery_scores[0] - recovery_scores[-1]
        trend_emoji = "📈" if recent_trend > 0 else "📉" if recent_trend < 0 else "➡️"
        trend_text = "improving" if recent_trend > 0 else "declining" if recent_trend < 0 else "stable"
    else:
        trend_emoji = "➡️"
        trend_text = "stable"
    
    return {
        'records': list(zip(dates, recovery_scores, hrv_values, rhr_values)),
        'averages': {
            'recovery': avg_recovery,
            'hrv': avg_hrv,
            'rhr': avg_rhr
        },
        'trend': {
            'emoji': trend_emoji,
            'text': trend_text,
            'change': recent_trend if len(recovery_scores) >= 2 else 0
        }
    }

def format_recovery_report(analysis):
    """Format recovery analysis into a readable report"""
    if isinstance(analysis, str):
        return f"❌ {analysis}"
    
    report = []
    report.append("🏃‍♀️ **WHOOP Recovery Stats — Last 5 Days**")
    report.append("=" * 45)
    report.append("")
    
    # Daily breakdown
    report.append("📊 **Daily Breakdown:**")
    for date, recovery, hrv, rhr in analysis['records']:
        recovery_emoji = "🟢" if recovery >= 70 else "🟡" if recovery >= 50 else "🔴"
        report.append(f"{recovery_emoji} **{date}** — Recovery: {recovery:.0f}% | HRV: {hrv:.1f}ms | RHR: {rhr:.0f} bpm")
    
    report.append("")
    
    # Averages
    avg = analysis['averages']
    report.append("📈 **5-Day Averages:**")
    report.append(f"🎯 **Recovery:** {avg['recovery']:.1f}%")
    report.append(f"💓 **HRV:** {avg['hrv']:.1f}ms")  
    report.append(f"🫀 **Resting HR:** {avg['rhr']:.0f} bpm")
    report.append("")
    
    # Trend analysis
    trend = analysis['trend']
    report.append("📊 **Trend Analysis:**")
    report.append(f"{trend['emoji']} Recovery trend: **{trend['text']}**")
    if abs(trend['change']) > 1:
        report.append(f"Change: {trend['change']:+.1f}% over period")
    
    report.append("")
    
    # Health insights
    avg_recovery = avg['recovery']
    if avg_recovery >= 70:
        report.append("✅ **Great recovery performance!** Keep up the good work")
    elif avg_recovery >= 50:
        report.append("🟡 **Moderate recovery.** Focus on sleep quality and stress management")
    else:
        report.append("🔴 **Low recovery detected.** Consider rest, better sleep, or reviewing training load")
    
    return "\n".join(report)

def main():
    """CLI interface for recovery statistics"""
    print("🏃‍♀️ Fetching WHOOP recovery statistics...")
    
    # Get recovery data
    records = get_recovery_history(days=5)
    
    if not records:
        print("❌ No recovery data found for the last 5 days")
        return
    
    # Analyze data
    analysis = analyze_recovery_trends(records)
    
    # Format and display report
    report = format_recovery_report(analysis)
    print(report)

if __name__ == "__main__":
    main()