#!/usr/bin/env python3
"""
小红书笔记抓取 - 调用 XHS-Downloader 可执行文件

使用方法:
    python xhs_download.py "笔记URL" --output /tmp/xhs_note --ocr
"""

import argparse
import json
import os
import re
import subprocess
import shutil
from pathlib import Path
from datetime import datetime
import time


XHS_EXECUTABLE = "/Users/lixiaoji/Downloads/XHS-Downloader_V2/main"
XHS_DOWNLOAD_DIR = Path("/Users/lixiaoji/Downloads/XHS-Downloader_V2/_internal/Volume/Download")
XHS_DATA_DIR = Path("/Users/lixiaoji/Downloads/XHS-Downloader_V2/_internal/Volume")


def extract_note_id(url: str) -> str:
    """从 URL 提取笔记 ID"""
    patterns = [
        r'/explore/([a-f0-9]{24})',
        r'/discovery/item/([a-f0-9]{24})',
        r'/item/([a-f0-9]{24})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def ocr_image_vision(image_path: str) -> str:
    """使用 macOS Vision 进行 OCR"""
    swift_code = '''
import Vision
import AppKit
let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(0) }
let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for observation in observations {
        if let topCandidate = observation.topCandidates(1).first { print(topCandidate.string) }
    }
}
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
'''
    swift_file = '/tmp/ocr_vision.swift'
    with open(swift_file, 'w') as f:
        f.write(swift_code)
    try:
        result = subprocess.run(['swift', swift_file, image_path], capture_output=True, text=True, timeout=60)
        return result.stdout.strip() if result.returncode == 0 else None
    except:
        return None


def get_files_before_download() -> set:
    """获取下载前的文件列表"""
    if not XHS_DOWNLOAD_DIR.exists():
        return set()
    return set(f.name for f in XHS_DOWNLOAD_DIR.iterdir() if f.is_file())


def get_new_files(before_files: set) -> list:
    """获取新下载的文件"""
    if not XHS_DOWNLOAD_DIR.exists():
        return []
    current_files = set(f.name for f in XHS_DOWNLOAD_DIR.iterdir() if f.is_file())
    new_files = current_files - before_files
    return [XHS_DOWNLOAD_DIR / f for f in sorted(new_files)]


def download_note(url: str, record_data: bool = True) -> tuple:
    """
    调用 XHS-Downloader 下载笔记
    
    Returns:
        (success: bool, new_files: list, data: dict)
    """
    before_files = get_files_before_download()
    
    cmd = [
        XHS_EXECUTABLE,
        "--url", url,
        "--record_data", "true" if record_data else "false",
    ]
    
    print(f"执行: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(XHS_DATA_DIR.parent)
        )
        
        print(f"返回码: {result.returncode}")
        if result.stdout:
            print(f"输出: {result.stdout[:500]}")
        if result.stderr:
            print(f"错误: {result.stderr[:500]}")
        
    except subprocess.TimeoutExpired:
        print("下载超时")
        return False, [], {}
    except Exception as e:
        print(f"执行失败: {e}")
        return False, [], {}
    
    # 等待文件写入完成
    time.sleep(2)
    
    # 获取新文件
    new_files = get_new_files(before_files)
    
    # 尝试读取数据文件
    data = {}
    data_file = XHS_DATA_DIR / "ExploreData.db"
    # TODO: 可以从 SQLite 数据库读取详细信息
    
    return len(new_files) > 0, new_files, data


def main():
    parser = argparse.ArgumentParser(description='小红书笔记抓取 (XHS-Downloader)')
    parser.add_argument('url', help='笔记 URL')
    parser.add_argument('--output', '-o', help='输出目录')
    parser.add_argument('--ocr', action='store_true', help='对图片进行 OCR')
    parser.add_argument('--no-download', action='store_true', help='仅获取信息不下载')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("小红书笔记抓取 (XHS-Downloader)")
    print("=" * 60)
    
    note_id = extract_note_id(args.url)
    print(f"\n笔记 ID: {note_id or '(从链接提取)'}")
    print(f"URL: {args.url}")
    
    # 下载
    print("\n正在下载...")
    success, new_files, data = download_note(args.url, record_data=True)
    
    if not success and not new_files:
        print("❌ 下载失败或无新文件")
        return
    
    print(f"\n✓ 下载完成，{len(new_files)} 个新文件:")
    for f in new_files:
        print(f"  - {f.name}")
    
    # 复制到输出目录
    if args.output and new_files:
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        images_dir = output_dir / 'images'
        images_dir.mkdir(exist_ok=True)
        
        copied_files = []
        for f in new_files:
            dest = images_dir / f.name
            shutil.copy2(f, dest)
            copied_files.append(str(dest))
            print(f"  ✓ 复制: {f.name}")
        
        # OCR
        ocr_results = []
        if args.ocr:
            print("\n正在进行 OCR...")
            for f in copied_files:
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    text = ocr_image_vision(f)
                    if text:
                        ocr_results.append({
                            'image': Path(f).name,
                            'text': text
                        })
                        print(f"  {Path(f).name}: {len(text)} 字符")
        
        # 从文件名解析信息
        # 格式: 发布时间_作者昵称_作品标题_序号.扩展名
        title = ""
        author = ""
        publish_time = ""
        if new_files:
            parts = new_files[0].stem.split('_')
            if len(parts) >= 3:
                publish_time = f"{parts[0]}_{parts[1]}"
                author = parts[2]
                title = '_'.join(parts[3:-1]) if len(parts) > 4 else parts[3] if len(parts) > 3 else ""
        
        # 保存结果
        result_data = {
            'note_id': note_id or '',
            'fetch_time': datetime.now().isoformat(),
            'title': title,
            'author': author,
            'publish_time': publish_time,
            'url': args.url,
            'local_files': copied_files,
            'ocr_results': ocr_results,
        }
        
        with open(output_dir / 'note.json', 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        
        # 生成 Markdown
        md = f"""# {title}

**作者**: {author}  
**发布时间**: {publish_time}  
**抓取时间**: {result_data['fetch_time']}

---

## 图片

"""
        for f in copied_files:
            name = Path(f).name
            md += f"![{name}](images/{name})\n\n"
            for ocr in ocr_results:
                if ocr['image'] == name:
                    md += f"**OCR 识别文字:**\n\n```\n{ocr['text']}\n```\n\n"
        
        with open(output_dir / 'note.md', 'w', encoding='utf-8') as f:
            f.write(md)
        
        print(f"\n输出目录: {output_dir}")
    
    print("\n✅ 完成!")


if __name__ == '__main__':
    main()
