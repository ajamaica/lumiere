import os
import sys
import requests
import json


def ppt_theme_list(api_key: str):
    url = "https://qianfan.baidubce.com/v2/tools/ai_ppt/get_ppt_theme"
    headers = {
        "Authorization": "Bearer %s" % api_key,
    }
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    result = response.json()
    if "errno" in result and result["errno"] != 0:
        raise RuntimeError(result["errmsg"])
    return result["data"]["ppt_themes"]


if __name__ == "__main__":
    api_key = os.getenv("BAIDU_API_KEY")
    if not api_key:
        print("Error: BAIDU_API_KEY  must be set in environment.")
        sys.exit(1)
    try:
        results = ppt_theme_list(api_key)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)