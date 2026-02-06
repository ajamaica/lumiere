#!/usr/bin/env python3
"""
Test WHOOP Behavior Modes with mock data
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))
from morning_check import create_behavior_context, save_daily_context

def test_sleep_scenarios():
    """Test different sleep quality scenarios"""
    
    scenarios = [
        {
            "name": "Excellent Sleep",
            "summary": {
                "status": "excellent",
                "sleep_performance": 95,
                "sleep_efficiency": 93,
                "recovery_score": 85,
                "sleep_duration_hours": 8.2,
                "message": "🌟 Excellent sleep! High energy mode activated"
            }
        },
        {
            "name": "Good Sleep", 
            "summary": {
                "status": "good",
                "sleep_performance": 82,
                "sleep_efficiency": 88,
                "recovery_score": 75,
                "sleep_duration_hours": 7.5,
                "message": "😊 Good sleep quality, ready for the day"
            }
        },
        {
            "name": "Fair Sleep",
            "summary": {
                "status": "fair", 
                "sleep_performance": 72,
                "sleep_efficiency": 78,
                "recovery_score": 60,
                "sleep_duration_hours": 6.8,
                "message": "🙂 Decent sleep, taking it steady"
            }
        },
        {
            "name": "Poor Sleep",
            "summary": {
                "status": "poor",
                "sleep_performance": 55,
                "sleep_efficiency": 65,
                "recovery_score": 35,
                "sleep_duration_hours": 5.5,
                "message": "😴 Poor sleep detected, gentle mode activated"
            }
        }
    ]
    
    print("🏃‍♀️ WHOOP Behavior Testing")
    print("=" * 40)
    
    for scenario in scenarios:
        summary = scenario["summary"]
        context = create_behavior_context(summary)
        
        print(f"\n📊 {scenario['name']}:")
        print(f"Sleep Performance: {summary['sleep_performance']}% ({summary['status'].upper()})")
        print(f"Recovery Score: {summary['recovery_score']}")
        print(f"Duration: {summary['sleep_duration_hours']}h")
        
        print(f"\n🤖 Behavior Mode: {context['behavior_mode']}")
        print(f"Communication: {context['communication_style']}")
        print(f"Energy Level: {context['energy_level']}")
        print(f"Task Complexity: {context['task_complexity']}")
        
        print(f"\n💡 Recommendations:")
        for rec in context['recommendations']:
            print(f"- {rec}")
        print("-" * 40)

if __name__ == "__main__":
    test_sleep_scenarios()