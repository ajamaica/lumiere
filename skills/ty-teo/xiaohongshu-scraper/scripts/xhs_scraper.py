#!/usr/bin/env python3
"""
小红书笔记完整抓取工具 - 下载+OCR+保存
输出目录结构: output_dir/笔记标题/{note.json, note.md, images/, ocr/}
"""

import argparse, json, re, requests, subprocess, shutil, sys
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

API_BASE = "http://127.0.0.1:5556"
XHS_DOWNLOAD_DIR = Path("/Users/lixiaoji/Downloads/XHS-Downloader-master-2/Volume/Download")
DEFAULT_OUTPUT_DIR = Path("/Users/lixiaoji/clawd/data/xhs")

def clean_filename(name: str, max_len: int = 50) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\n\r\t]', '', name).strip(' .')
    return cleaned[:max_len].strip() if len(cleaned) > max_len else cleaned or 'untitled'

class XHSScraper:
    def __init__(self, output_dir: Optional[Path] = None, do_ocr: bool = True):
        self.output_dir = output_dir or DEFAULT_OUTPUT_DIR
        self.do_ocr = do_ocr
        
    def check_api_running(self) -> bool:
        try:
            r = requests.get(f"{API_BASE}/docs", timeout=10)
            return 'html' in r.text.lower()  # 检查返回内容
        except Exception as e:
            return False
    
    def ensure_api_running(self) -> bool:
        # 直接尝试请求，不做预检测
        return True
    
    @staticmethod
    def ocr_image(image_path: str) -> Optional[str]:
        """macOS Vision OCR"""
        swift_code = '''
import Vision; import AppKit
let p = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: p), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(0) }
let req = VNRecognizeTextRequest { r, _ in
    (r.results as? [VNRecognizedTextObservation])?.forEach { if let t = $0.topCandidates(1).first { print(t.string) } }
}
req.recognitionLevel = .accurate; req.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
'''
        with open('/tmp/ocr.swift', 'w') as f: f.write(swift_code)
        try:
            r = subprocess.run(['swift', '/tmp/ocr.swift', image_path], capture_output=True, text=True, timeout=60)
            return r.stdout.strip() if r.returncode == 0 else None
        except:
            return None
    
    def find_files(self, title: str, author: str) -> List[Path]:
        if not XHS_DOWNLOAD_DIR.exists(): return []
        clean_title = re.sub(r'[^\w\u4e00-\u9fff]', '', title)[:15] if title else ''
        clean_author = re.sub(r'[^\w\u4e00-\u9fff]', '', author) if author else ''
        files = []
        for f in XHS_DOWNLOAD_DIR.iterdir():
            if f.is_file() and f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.heic', '.mp4', '.mov'):
                score = 0
                if clean_author and clean_author in f.name: score += 3
                if clean_title and clean_title[:8] in f.name: score += 2
                if score >= 3: files.append((f, score))
        if files:
            max_s = max(s for _, s in files)
            return sorted([f for f, s in files if s == max_s], key=lambda x: x.name)
        return []
    
    def scrape_note(self, url: str, download: bool = True) -> Dict[str, Any]:
        print(f"正在获取: {url}", file=sys.stderr)
        import time
        data = {}
        for attempt in range(3):
            try:
                time.sleep(1)
                # 使用 curl 更稳定
                import subprocess
                payload = json.dumps({"url": url, "download": download})
                result = subprocess.run(
                    ['curl', '-s', '-X', 'POST', f'{API_BASE}/xhs/detail',
                     '-H', 'Content-Type: application/json', '-d', payload],
                    capture_output=True, text=True, timeout=120
                )
                if result.returncode != 0 or not result.stdout.strip():
                    print(f"  ⚠️ curl 失败，重试 {attempt+1}/3...", file=sys.stderr)
                    time.sleep(3)
                    continue
                resp_data = json.loads(result.stdout)
                data = resp_data.get("data", {})
                if data:
                    break
                elif "失败" in resp_data.get("message", ""):
                    print(f"  ⚠️ {resp_data.get('message')}，重试 {attempt+1}/3...", file=sys.stderr)
                    time.sleep(3)
                    continue
            except Exception as e:
                if attempt < 2:
                    print(f"  ⚠️ 请求失败，重试 {attempt+1}/3: {e}", file=sys.stderr)
                    time.sleep(3)
                    continue
                print(f"❌ 获取失败: {e}", file=sys.stderr)
                return {'error': str(e)}
        
        if not data:
            print("❌ 未获取到数据", file=sys.stderr)
            return {'error': '未获取到数据'}
        
        # 标准化
        tags = [t.strip() for t in data.get('作品标签', '').split() if t.strip()]
        note = {
            'note_id': data.get('作品ID', ''),
            'title': data.get('作品标题', ''),
            'desc': data.get('作品描述', ''),
            'type': data.get('作品类型', ''),
            'author': {'nickname': data.get('作者昵称', ''), 'user_id': data.get('作者ID', ''), 'profile_url': data.get('作者链接', '')},
            'interact': {'liked': int(data.get('点赞数量', '0').replace('-','0')), 'collected': int(data.get('收藏数量', '0').replace('-','0')), 'comment': int(data.get('评论数量', '0').replace('-','0'))},
            'tags': tags,
            'publish_time': data.get('发布时间', ''),
            'url': data.get('作品链接', ''),
            'download_urls': data.get('下载地址', []),
            'fetch_time': datetime.now().isoformat(),
        }
        
        title, author = note['title'], note['author']['nickname']
        print(f"📝 {title} | 👤 {author}", file=sys.stderr)
        
        # 创建目录（用标题命名）
        folder = clean_filename(title)
        note_dir = self.output_dir / folder
        if note_dir.exists(): note_dir = self.output_dir / f"{folder}_{note['note_id'][:8]}"
        note_dir.mkdir(parents=True, exist_ok=True)
        (note_dir / 'images').mkdir(exist_ok=True)
        
        # 查找并复制文件
        import time; time.sleep(2)
        files = self.find_files(title, author) if download else []
        copied = []
        for i, f in enumerate(files, 1):
            dest = note_dir / 'images' / f"{i:02d}{f.suffix.lower()}"
            shutil.copy2(f, dest)
            copied.append(dest)
            print(f"  ✓ {f.name} -> {dest.name}", file=sys.stderr)
        
        note['local_files'] = [f"images/{f.name}" for f in copied]
        
        # OCR
        ocr_results = []
        if self.do_ocr and copied:
            print("正在 OCR...", file=sys.stderr)
            (note_dir / 'ocr').mkdir(exist_ok=True)
            for f in copied:
                if f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'):
                    text = self.ocr_image(str(f))
                    if text:
                        ocr_file = note_dir / 'ocr' / f"{f.stem}.md"
                        ocr_file.write_text(f"# OCR: {f.stem}\n\n{text}\n")
                        ocr_results.append({'image': f.name, 'text': text})
                        print(f"  📝 {f.name}: {len(text)} 字符", file=sys.stderr)
        
        note['ocr_results'] = ocr_results
        
        # 保存 JSON
        (note_dir / 'note.json').write_text(json.dumps(note, ensure_ascii=False, indent=2))
        
        # 生成 Markdown
        md = f"# {title}\n\n**作者**: {author} | **发布**: {note['publish_time']} | **类型**: {note['type']}\n"
        md += f"**互动**: ❤️{note['interact']['liked']} ⭐{note['interact']['collected']} 💬{note['interact']['comment']}\n"
        md += f"**标签**: {' '.join(f'#{t}' for t in tags)}\n**链接**: {note['url']}\n\n---\n\n## 正文\n\n{note['desc']}\n\n---\n\n## 图片\n\n"
        for f in note['local_files']:
            md += f"![{Path(f).name}]({f})\n\n"
            for ocr in ocr_results:
                if ocr['image'] == Path(f).name:
                    md += f"<details><summary>📝 OCR</summary>\n\n```\n{ocr['text']}\n```\n</details>\n\n"
        (note_dir / 'note.md').write_text(md)
        
        print(f"✅ 保存到: {note_dir}", file=sys.stderr)
        return note

def main():
    parser = argparse.ArgumentParser(description='小红书笔记抓取')
    parser.add_argument('urls', nargs='+', help='笔记URL')
    parser.add_argument('--output', '-o', default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument('--no-ocr', action='store_true')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    
    scraper = XHSScraper(Path(args.output), not args.no_ocr)
    if not scraper.ensure_api_running(): sys.exit(1)
    
    results = [scraper.scrape_note(u) for u in args.urls]
    if args.json: print(json.dumps(results[0] if len(results)==1 else results, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
