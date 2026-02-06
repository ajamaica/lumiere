#!/usr/bin/env python3
"""
WHOOP API Client
Main client for interacting with WHOOP API
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional

def get_whoop_credentials():
    """Get WHOOP credentials from multiple sources (OpenClaw config, env vars)"""
    client_id = None
    client_secret = None
    
    # Try environment variables first
    client_id = os.getenv('WHOOP_CLIENT_ID')
    client_secret = os.getenv('WHOOP_CLIENT_SECRET')
    
    # Try OpenClaw config if env vars not found
    if not client_id or not client_secret:
        try:
            openclaw_config_path = os.path.expanduser('~/.openclaw/openclaw.json')
            with open(openclaw_config_path, 'r') as f:
                config = json.load(f)
                
            skill_config = config.get('skills', {}).get('entries', {}).get('whoop-integration', {})
            
            if not client_id:
                client_id = skill_config.get('clientId')
            if not client_secret:
                client_secret = skill_config.get('clientSecret') or skill_config.get('apiKey')  # OpenClaw stores as apiKey
                
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            pass  # Config not available or malformed
    
    return client_id, client_secret

class WhoopClient:
    def __init__(self):
        self.base_url = "https://api.prod.whoop.com/developer"
        self.tokens_path = os.path.expanduser("~/.openclaw/whoop_tokens.json")
        self.access_token = None
        self.refresh_token = None
        self._load_tokens()
    
    def _load_tokens(self):
        """Load access tokens from config"""
        try:
            with open(self.tokens_path, 'r') as f:
                tokens = json.load(f)
                self.access_token = tokens.get('access_token')
                self.refresh_token = tokens.get('refresh_token')
        except FileNotFoundError:
            print("❌ No tokens found. Please run: python3 scripts/oauth_setup.py")
        except json.JSONDecodeError:
            print("❌ Invalid token file. Please re-run OAuth setup.")
    
    def _save_tokens(self, tokens: Dict):
        """Save tokens to config file"""
        with open(self.tokens_path, 'w') as f:
            json.dump(tokens, f, indent=2)
        self.access_token = tokens.get('access_token')
        self.refresh_token = tokens.get('refresh_token')
    
    def _refresh_access_token(self) -> bool:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            return False
        
        client_id, client_secret = get_whoop_credentials()
        
        if not client_id or not client_secret:
            print("❌ Missing WHOOP_CLIENT_ID/CLIENT_SECRET for token refresh")
            print("Configure with: openclaw configure --section skills")
            return False
        
        token_url = "https://api.prod.whoop.com/developer/oauth/oauth2/token"
        
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token,
            'client_id': client_id,
            'client_secret': client_secret
        }
        
        try:
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            
            new_tokens = response.json()
            self._save_tokens(new_tokens)
            print("✅ Access token refreshed")
            return True
            
        except requests.RequestException as e:
            print(f"❌ Token refresh failed: {e}")
            return False
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make authenticated request to WHOOP API"""
        if not self.access_token:
            print("❌ No access token available")
            return None
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 401:
                print("🔄 Token expired, refreshing...")
                if self._refresh_access_token():
                    headers['Authorization'] = f'Bearer {self.access_token}'
                    response = requests.get(url, headers=headers, params=params)
                else:
                    print("❌ Token refresh failed")
                    return None
            
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            print(f"❌ API request failed: {e}")
            return None
    
    def get_user_profile(self) -> Optional[Dict]:
        """Get basic user profile information"""
        return self._make_request('/user/profile/basic')
    
    def get_latest_sleep(self) -> Optional[Dict]:
        """Get the most recent sleep data"""
        # Get sleep data from last 7 days to ensure we get recent data
        end_time = datetime.now().isoformat() + 'Z'
        start_time = (datetime.now() - timedelta(days=7)).isoformat() + 'Z'
        
        params = {
            'start': start_time,
            'end': end_time,
            'limit': 1
        }
        
        response = self._make_request('/v2/activity/sleep', params)
        
        if response and response.get('records'):
            return response['records'][0]  # Most recent sleep
        
        return None
    
    def get_latest_recovery(self) -> Optional[Dict]:
        """Get the most recent recovery data"""
        end_time = datetime.now().isoformat() + 'Z'
        start_time = (datetime.now() - timedelta(days=7)).isoformat() + 'Z'
        
        params = {
            'start': start_time,
            'end': end_time,
            'limit': 1
        }
        
        response = self._make_request('/v2/recovery', params)
        
        if response and response.get('records'):
            return response['records'][0]
        
        return None
    
    def get_sleep_performance_summary(self) -> Dict:
        """Get a summary of latest sleep and recovery for easy analysis"""
        sleep_data = self.get_latest_sleep()
        recovery_data = self.get_latest_recovery()
        
        summary = {
            'status': 'unknown',
            'sleep_performance': None,
            'sleep_efficiency': None,
            'recovery_score': None,
            'hrv': None,
            'resting_hr': None,
            'sleep_duration_hours': None,
            'message': 'No recent data available'
        }
        
        if sleep_data and 'score' in sleep_data:
            score = sleep_data['score']
            
            # Sleep metrics
            summary['sleep_performance'] = score.get('sleep_performance_percentage')
            summary['sleep_efficiency'] = score.get('sleep_efficiency_percentage')
            
            # Calculate sleep duration
            if 'stage_summary' in score:
                total_sleep_ms = (
                    score['stage_summary'].get('total_light_sleep_time_milli', 0) +
                    score['stage_summary'].get('total_slow_wave_sleep_time_milli', 0) +
                    score['stage_summary'].get('total_rem_sleep_time_milli', 0)
                )
                summary['sleep_duration_hours'] = round(total_sleep_ms / (1000 * 60 * 60), 1)
            
            # Sleep quality assessment
            performance = summary['sleep_performance'] or 0
            if performance >= 90:
                summary['status'] = 'excellent'
                summary['message'] = '🌟 Excellent sleep! High energy mode activated'
            elif performance >= 80:
                summary['status'] = 'good' 
                summary['message'] = '😊 Good sleep quality, ready for the day'
            elif performance >= 70:
                summary['status'] = 'fair'
                summary['message'] = '🙂 Decent sleep, taking it steady'
            else:
                summary['status'] = 'poor'
                summary['message'] = '😴 Poor sleep detected, gentle mode activated'
        
        if recovery_data and 'score' in recovery_data:
            score = recovery_data['score']
            summary['recovery_score'] = score.get('recovery_score')
            summary['hrv'] = score.get('hrv_rmssd_milli')
            summary['resting_hr'] = score.get('resting_heart_rate')
        
        return summary

def main():
    """CLI interface for testing WHOOP client"""
    client = WhoopClient()
    
    print("🏃‍♀️ WHOOP Client Test")
    print("=" * 30)
    
    # Note: User profile requires read:profile scope (not included in current OAuth scopes)
    # Current scopes: read:sleep read:recovery read:cycles
    
    # Test sleep data
    print("\n😴 Getting latest sleep data...")
    summary = client.get_sleep_performance_summary()
    
    print(f"\n📊 Sleep Performance Summary:")
    print(f"Status: {summary['status'].upper()}")
    print(f"Message: {summary['message']}")
    print(f"Sleep Performance: {summary['sleep_performance']}%")
    print(f"Sleep Efficiency: {summary['sleep_efficiency']}%")
    print(f"Sleep Duration: {summary['sleep_duration_hours']}h")
    print(f"Recovery Score: {summary['recovery_score']}")
    print(f"HRV: {summary['hrv']}")
    print(f"Resting HR: {summary['resting_hr']}")

if __name__ == "__main__":
    main()