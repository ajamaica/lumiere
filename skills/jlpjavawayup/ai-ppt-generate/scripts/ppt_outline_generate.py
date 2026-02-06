import os
import sys
import requests
import json
import argparse


def ppt_outline_generate(api_key: str, query: str, resource_url: str = None, page_range: str = None,
                         layout: int = None, language_option: str = "default", gen_mode: int = None):
    url = "https://qianfan.baidubce.com/v2/tools/ai_ppt/generate_outline"
    headers = {
        "Authorization": "Bearer %s" % api_key,
        "Content-Type": "application/json"
    }
    headers.setdefault('Accept', 'text/event-stream')
    headers.setdefault('Cache-Control', 'no-cache')
    headers.setdefault('Connection', 'keep-alive')
    params = {
        "query": query,
    }
    if resource_url:
        params["resource_url"] = resource_url
    if page_range:
        params["page_range"] = page_range
    if layout:
        params["layout"] = layout
    if language_option:
        params["language_option"] = language_option
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
    parser.add_argument("--query", "-q", type=str, required=True, help="query, ppt title or topic")
    parser.add_argument("--resource_url", "-ru", type=str, default=None,
                        help="Resource file URL, supporting formats such as documents and images (supported formats: doc, pdf, ppt, pptx, png, jpeg, jpg)")
    parser.add_argument("--page_range", "-pr", type=str, default=None,
                        choices=['1-10', '11-20', '21-30', '31-40', '40+'],
                        help="ppt page number of range,enums:['1-10','11-20','21-30','31-40','40+']")
    parser.add_argument("--layout", "-l", type=int, default=None, choices=[1, 2],
                        help="Layout modes: 1: Minimalist Mode, 2: Professional Mode")
    parser.add_argument("--language_option", "-lg", type=str, default="default", choices=["default", "en", "zh"],
                        help="language option,support en,zh")
    parser.add_argument("--gen_mode", "-gm", type=int, default=None, choices=[1, 2],
                        help="PPT generation mode: 1: Intelligent polishing; 2: Strict compliance")
    args = parser.parse_args()

    api_key = os.getenv("BAIDU_API_KEY")
    if not api_key:
        print("Error: BAIDU_API_KEY  must be set in environment.")
        sys.exit(1)
    try:
        results = ppt_outline_generate(api_key, args.query, args.resource_url, args.page_range, args.layout,
                                       args.language_option, args.gen_mode)
        for result in results:
            print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
