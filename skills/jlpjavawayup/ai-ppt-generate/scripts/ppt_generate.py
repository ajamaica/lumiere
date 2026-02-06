import os
import sys
import requests
import json
import argparse


def ppt_generate(api_key: str, query_id: int, chat_id: int, query: str, outline: str, title: str, style_id: int,
                 tpl_id: int, resource_url: str, custom_tpl_url: str, gen_mode: int, ai_info: bool = False):
    url = "https://qianfan.baidubce.com/v2/tools/ai_ppt/generate_ppt_by_outline"
    headers = {
        "Authorization": "Bearer %s" % api_key,
        "Content-Type": "application/json"
    }
    headers.setdefault('Accept', 'text/event-stream')
    headers.setdefault('Cache-Control', 'no-cache')
    headers.setdefault('Connection', 'keep-alive')
    params = {
        "query_id": query_id,
        "chat_id": chat_id,
        "query": query,
        "outline": outline,
        "title": title,
        "style_id": style_id,
        "tpl_id": tpl_id,
        "ai_info": ai_info
    }
    if resource_url:
        params["resource_url"] = resource_url
    if custom_tpl_url:
        params["custom_tpl_url"] = custom_tpl_url
    if gen_mode:
        params["gen_mode"] = gen_mode
    with requests.post(url, headers=headers, json=params, stream=True) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            line = line.decode('utf-8')
            if line and line.startswith("data:"):
                data_str = line[5:].strip()
                yield json.loads(data_str)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ppt outline generate input parameters")
    parser.add_argument("--query_id", "-qi", type=int, required=True, help="query id")
    parser.add_argument("--chat_id", "-ci", type=int, required=True, help="chat id")
    parser.add_argument("--outline", "-o", type=str, required=True, help="ppt outline,markdown format")
    parser.add_argument("--query", "-q", type=str, required=True, help="user origin query")
    parser.add_argument("--title", "-t", type=str, required=True, help="ppt title")
    parser.add_argument("--style_id", "-si", type=int, required=True, help="style id")
    parser.add_argument("--tpl_id", "-ti", type=int, required=True, help="template id")
    parser.add_argument("--resource_url", "-ru", type=str, default=None,
                        help="Resource file URL, supporting formats such as documents and images (supported formats: doc, pdf, ppt, pptx, png, jpeg, jpg)")
    parser.add_argument("--custom_tpl_url", "-ctu", type=str, default=None,
                        help="user custom ppt template url, must can be download")
    parser.add_argument("--gen_mode", "-gm", type=int, default=None, choices=[1, 2],
                        help="PPT generation mode: 1: Intelligent polishing; 2: Strict compliance")
    parser.add_argument("--ai_info", "-ai", type=bool, default=False,
                        help="If true, there will be information about the AI-generated PPT on the last page of the generated PPT")
    args = parser.parse_args()

    api_key = os.getenv("BAIDU_API_KEY")
    if not api_key:
        print("Error: BAIDU_API_KEY  must be set in environment.")
        sys.exit(1)
    try:
        results = ppt_generate(api_key, args.query_id, args.chat_id, args.query, args.outline, args.title, args.style_id,
                               args.tpl_id, args.resource_url, args.custom_tpl_url, args.gen_mode, args.ai_info)
        for result in results:
            print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
