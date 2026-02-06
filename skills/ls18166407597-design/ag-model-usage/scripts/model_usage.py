import requests
import json
import os
import sys
from datetime import datetime

def format_time(iso_str):
    if not iso_str or iso_str == "Unknown":
        return "未知"
    try:
        # Parse ISO string
        dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        # Convert to local time (assuming system local)
        local_dt = dt.astimezone()
        return local_dt.strftime('%m-%d %H:%M')
    except:
        return iso_str

def get_quota():
    auth_path = os.path.expanduser("~/.openclaw/agents/main/agent/auth-profiles.json")
    if not os.path.exists(auth_path):
        return "错误：找不到认证文件。"
    
    try:
        with open(auth_path, 'r') as f:
            auth_data = json.load(f)
        
        # Identify the relevant profile
        profile_key = next((k for k in auth_data['profiles'] if "google-antigravity" in k), None)
        if not profile_key:
            return "错误：未找到 Google Antigravity 认证信息。"
            
        profile = auth_data['profiles'][profile_key]
        access_token = profile['access']
        project_id = profile.get('projectId', 'bamboo-precept-lgxtn')
        
        url = "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "User-Agent": "antigravity/1.16.5 macos/arm64"
        }
        payload = {"project": project_id}
        
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', {})
            
            output = ["AI 模型用量报告：\n"]
            
            # Key models to watch
            watch_list = ['gemini-3-flash', 'gemini-3-pro-high', 'claude-sonnet-4-5', 'claude-opus-4-5-thinking']
            
            # Sort by name
            for name in sorted(models.keys()):
                short_name = name.split('/')[-1]
                # Filter for core models or requested ones
                if any(m in short_name for m in watch_list):
                    info = models[name]
                    quota = info.get('quotaInfo', {})
                    if quota:
                        pct = int(quota.get('remainingFraction', 0) * 100)
                        reset = format_time(quota.get('resetTime'))
                        status = "🟢" if pct > 30 else ("🟡" if pct > 0 else "🔴")
                        output.append(f"{status} {short_name}")
                        output.append(f"  剩余: {pct}%")
                        output.append(f"  刷新时间: {reset}")
                        output.append("")
            
            if len(output) == 1:
                return "成功获取数据，但未发现匹配的模型。"
            
            return "\n".join(output)
        else:
            return f"请求失败 ({response.status_code}): {response.text[:100]}"
            
    except Exception as e:
        return f"执行出错: {str(e)}"

if __name__ == "__main__":
    print(get_quota())
