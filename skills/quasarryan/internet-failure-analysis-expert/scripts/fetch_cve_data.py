#!/usr/bin/env python3
"""
CVE数据获取脚本
从NVD（National Vulnerability Database）API获取CVE详细信息
并爬取发布方官方公告内容
"""

import sys
import json
import re
import requests
from datetime import datetime
from bs4 import BeautifulSoup


def extract_text_from_url(url: str) -> dict:
    """
    从URL爬取并提取页面文本内容

    参数:
        url: 目标URL

    返回:
        dict: {"success": bool, "content": str, "error": str}
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive"
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()

        # 检测编码
        if response.encoding == 'ISO-8859-1':
            response.encoding = response.apparent_encoding

        soup = BeautifulSoup(response.text, 'html.parser')

        # 移除脚本和样式
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()

        # 提取主要内容
        # 尝试常见的内容容器
        content_selectors = [
            'article',
            '[class*="content"]',
            '[class*="article"]',
            '[class*="post"]',
            '[id*="content"]',
            '[id*="article"]',
            '[id*="post"]',
            'main',
            'div.body',
            'div.entry-content',
            'div.post-content',
            'div.markdown-body'
        ]

        text = ""
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(separator='\n', strip=True)
                if len(text) > 200:  # 如果内容足够长，就使用它
                    break

        # 如果没有找到容器，使用整个body
        if not text or len(text) < 200:
            body = soup.find('body')
            if body:
                text = body.get_text(separator='\n', strip=True)

        # 清理文本
        text = re.sub(r'\n\s*\n', '\n\n', text)  # 合并多余空行
        text = text.strip()

        if len(text) < 100:
            return {
                "success": False,
                "content": "",
                "error": "提取的内容过短，可能不是有效的公告页面"
            }

        return {
            "success": True,
            "content": text,
            "error": None
        }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "content": "",
            "error": "请求超时"
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "content": "",
            "error": "连接失败"
        }
    except requests.exceptions.HTTPError as e:
        return {
            "success": False,
            "content": "",
            "error": f"HTTP错误: {e.response.status_code}"
        }
    except Exception as e:
        return {
            "success": False,
            "content": "",
            "error": f"爬取失败: {str(e)}"
        }


def fetch_cve(cve_id: str) -> dict:
    """
    获取CVE详细信息

    参数:
        cve_id: CVE编号，格式如 "CVE-2021-44228"

    返回:
        dict: 包含CVE详细信息的字典
    """
    # 验证CVE格式
    cve_id = cve_id.strip().upper()
    if not cve_id.startswith("CVE-"):
        raise ValueError(f"无效的CVE编号格式: {cve_id}。正确格式应为 CVE-YYYY-NNNN")

    # NVD API v2.0 endpoint
    base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    params = {"cveId": cve_id}

    headers = {
        "User-Agent": "CVE-Analysis-Agent/1.0"
    }

    try:
        # 发送GET请求
        response = requests.get(base_url, params=params, headers=headers, timeout=30)
        response.raise_for_status()

        data = response.json()

        # 检查是否找到了CVE
        if not data.get("vulnerabilities") or len(data["vulnerabilities"]) == 0:
            raise ValueError(f"CVE {cve_id} 未找到，可能编号错误或尚未被NVD收录")

        # 提取CVE数据
        cve_item = data["vulnerabilities"][0]["cve"]

        # 基本信息
        result = {
            "cve_id": cve_id,
            "description_zh": "",
            "description_en": "",
            "cvss_v3": {
                "score": None,
                "severity": None,
                "vector": None
            },
            "cvss_v2": {
                "score": None,
                "severity": None,
                "vector": None
            },
            "published_date": None,
            "modified_date": None,
            "vendors": [],
            "affected_products": [],
            "cwe_id": None,
            "cwe_name": None,
            "references": [],
            "exploitability": None,
            "attack_complexity": None,
            "privileges_required": None,
            "user_interaction": None,
            "scope": None,
            "confidentiality_impact": None,
            "integrity_impact": None,
            "availability_impact": None,
            "official_advisories": []  # 新增：官方公告列表
        }

        # 提取描述
        descriptions = cve_item.get("descriptions", [])
        for desc in descriptions:
            if desc["lang"] == "en":
                result["description_en"] = desc["value"]
            elif desc["lang"] == "zh" or desc["lang"] == "zh-CN":
                result["description_zh"] = desc["value"]

        # 如果没有中文描述，使用英文描述
        if not result["description_zh"]:
            result["description_zh"] = result["description_en"]

        # 提取CVSS v3.1评分
        metrics = cve_item.get("metrics", {})
        if "cvssMetricV31" in metrics:
            cvss_v31 = metrics["cvssMetricV31"][0]["cvssData"]
            result["cvss_v3"]["score"] = cvss_v31.get("baseScore")
            result["cvss_v3"]["severity"] = cvss_v31.get("baseSeverity")
            result["cvss_v3"]["vector"] = cvss_v31.get("vectorString")

            # 提取其他v3指标
            result["exploitability"] = cvss_v31.get("exploitabilityScore")
            result["attack_complexity"] = cvss_v31.get("attackComplexity")
            result["privileges_required"] = cvss_v31.get("privilegesRequired")
            result["user_interaction"] = cvss_v31.get("userInteraction")
            result["scope"] = cvss_v31.get("scope")
            result["confidentiality_impact"] = cvss_v31.get("confidentialityImpact")
            result["integrity_impact"] = cvss_v31.get("integrityImpact")
            result["availability_impact"] = cvss_v31.get("availabilityImpact")

        # 提取CVSS v2.0评分（如果没有v3）
        if "cvssMetricV2" in metrics:
            cvss_v2 = metrics["cvssMetricV2"][0]["cvssData"]
            result["cvss_v2"]["score"] = cvss_v2.get("baseScore")
            result["cvss_v2"]["severity"] = metrics["cvssMetricV2"][0].get("baseSeverity")
            result["cvss_v2"]["vector"] = cvss_v2.get("vectorString")

        # 提取时间信息
        result["published_date"] = cve_item.get("published")
        result["modified_date"] = cve_item.get("lastModified")

        # 提取受影响的厂商和产品
        vendors_set = set()
        products_set = set()

        if "configurations" in cve_item:
            for config in cve_item["configurations"]:
                if "nodes" in config:
                    for node in config["nodes"]:
                        if "cpeMatch" in node:
                            for cpe in node["cpeMatch"]:
                                cpe_str = cpe.get("cpe23Uri", "")
                                if cpe_str:
                                    # 解析CPE字符串格式
                                    # cpe:2.3:a:vendor:product:version:...
                                    parts = cpe_str.split(":")
                                    if len(parts) >= 5:
                                        vendors_set.add(parts[3])
                                        products_set.add(parts[4])

        result["vendors"] = sorted(list(vendors_set))
        result["affected_products"] = sorted(list(products_set))

        # 提取CWE信息
        if "weaknesses" in cve_item:
            weaknesses = cve_item["weaknesses"]
            if weaknesses and len(weaknesses) > 0:
                cwe_list = weaknesses[0].get("description", [])
                if cwe_list:
                    result["cwe_id"] = cwe_list[0].get("value")
                    result["cwe_name"] = cwe_list[0].get("description")

        # 提取参考资料并爬取官方公告
        official_advisory_tags = ["Vendor Advisory", "Third Party Advisory", "US Government Resource"]
        official_urls = []

        if "references" in cve_item:
            for ref in cve_item["references"]:
                url = ref.get("url")
                if url:
                    tags = ref.get("tags", [])
                    result["references"].append({
                        "url": url,
                        "tags": tags
                    })

                    # 识别官方公告URL
                    is_official = any(tag in official_advisory_tags for tag in tags)
                    if is_official:
                        official_urls.append(url)

        # 爬取官方公告内容（最多爬取3个，避免耗时过长）
        for url in official_urls[:3]:
            print(f"正在爬取官方公告: {url}", file=sys.stderr)
            fetch_result = extract_text_from_url(url)
            if fetch_result["success"]:
                result["official_advisories"].append({
                    "url": url,
                    "content": fetch_result["content"],
                    "error": None
                })
            else:
                result["official_advisories"].append({
                    "url": url,
                    "content": "",
                    "error": fetch_result["error"]
                })

        return result

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            raise ValueError(f"NVD API速率限制已触发，请等待30秒后重试。错误: {str(e)}")
        elif e.response.status_code == 404:
            raise ValueError(f"CVE {cve_id} 在NVD数据库中未找到")
        else:
            raise ValueError(f"NVD API请求失败，状态码: {e.response.status_code}, 错误: {str(e)}")

    except requests.exceptions.Timeout:
        raise ValueError(f"请求NVD API超时，请检查网络连接或稍后重试")

    except requests.exceptions.ConnectionError:
        raise ValueError(f"无法连接到NVD API，请检查网络连接")

    except requests.exceptions.RequestException as e:
        raise ValueError(f"NVD API请求异常: {str(e)}")

    except json.JSONDecodeError as e:
        raise ValueError(f"解析NVD API响应失败: {str(e)}")


def main():
    if len(sys.argv) != 2:
        print("用法: python fetch_cve_data.py <CVE-ID>")
        print("示例: python fetch_cve_data.py CVE-2021-44228")
        sys.exit(1)

    cve_id = sys.argv[1]

    try:
        result = fetch_cve(cve_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
