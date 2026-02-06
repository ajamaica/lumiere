#!/usr/bin/env python3
"""
Conversation Summary - Call API to generate conversation summaries
"""
import os
import sys
import json
import requests

# ============================================================================
# CONFIGURATION
# ============================================================================
SUMMARY_API_URL = "https://iautomark.sdm.qq.com/assistant-analyse/v1/assistant/poc/summary/trigger"

def summarize_conversation(chat_list: str, history_summary: str = "") -> dict:
    """
    Call the summary API to generate a conversation summary.
    
    Args:
        chat_list: JSON formatted conversation content
        history_summary: Previous summary for incremental update (optional)
    
    Returns:
        dict: API response with summary or error
    """
    if not chat_list or chat_list.strip() == "":
        return {"status": "error", "error": "chat_list 参数不能为空，请提供对话内容"}
    
    try:
        response = requests.post(
            SUMMARY_API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "chatList": chat_list,
                "historySummary": history_summary or ""
            },
            timeout=30
        )
        
        if not response.ok:
            return {
                "status": "error",
                "error": f"API 请求失败: HTTP {response.status_code} {response.reason}"
            }
        
        result = response.json()
        
        if result.get("code") != 0:
            return {
                "status": "error",
                "error": f"会话小结生成失败: {result.get('message', '未知错误')}"
            }
        
        return {
            "status": "completed",
            "summary": result.get("data", {}).get("summary", "无法生成摘要"),
            "message": "会话小结生成成功"
        }
        
    except requests.exceptions.Timeout:
        return {"status": "error", "error": "请求超时，请稍后重试"}
    except requests.exceptions.RequestException as e:
        return {"status": "error", "error": f"网络请求错误: {str(e)}"}
    except json.JSONDecodeError:
        return {"status": "error", "error": "API 返回数据格式错误"}
    except Exception as e:
        return {"status": "error", "error": f"未知错误: {str(e)}"}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python conversation_summary.py <chat_list> [history_summary]"
        }, ensure_ascii=False, indent=2))
        sys.exit(1)
    
    chat_list = sys.argv[1]
    history_summary = sys.argv[2] if len(sys.argv) > 2 else ""
    
    result = summarize_conversation(chat_list, history_summary)
    
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result.get("status") == "completed" else 1)


if __name__ == "__main__":
    main()
