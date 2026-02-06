#!/usr/bin/env python3
"""
文档索引构建器
支持增量索引、元数据提取、多文件类型
"""

import os
import re
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict
import math

# 默认配置
DEFAULT_TYPES = ['md', 'txt', 'rst', 'py', 'js', 'ts', 'yaml', 'yml', 'json']
DEFAULT_EXCLUDE = ['.git', 'node_modules', '__pycache__', '.venv', 'venv', '.cache']
MAX_FILE_SIZE = 1024 * 1024  # 1MB


def get_file_hash(filepath: Path) -> str:
    """计算文件内容哈希"""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def extract_frontmatter(content: str) -> Optional[Dict]:
    """提取 YAML frontmatter"""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        fm = {}
        for line in match.group(1).split('\n'):
            if ':' in line:
                key, val = line.split(':', 1)
                fm[key.strip()] = val.strip()
        return fm
    return None


def extract_headings(content: str) -> List[Dict]:
    """提取 Markdown 标题"""
    headings = []
    for i, line in enumerate(content.split('\n'), 1):
        match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if match:
            headings.append({
                'level': len(match.group(1)),
                'text': match.group(2).strip(),
                'line': i
            })
    return headings


def tokenize(text: str) -> List[str]:
    """简单分词（支持中英文）"""
    # 英文按空格和标点分割
    words = re.findall(r'[a-zA-Z0-9_]+', text.lower())
    # 中文按字符分割（简单处理）
    chinese = re.findall(r'[\u4e00-\u9fff]+', text)
    for c in chinese:
        words.extend(list(c))
    return words


def build_inverted_index(docs: Dict) -> Dict:
    """构建倒排索引"""
    index = defaultdict(list)
    
    for filepath, doc in docs.items():
        tokens = set()
        
        # 文件名 tokens
        name_tokens = tokenize(Path(filepath).stem)
        tokens.update(name_tokens)
        
        # 标题 tokens
        for h in doc.get('headings', []):
            tokens.update(tokenize(h['text']))
        
        # frontmatter tokens
        fm = doc.get('frontmatter', {})
        if fm:
            for v in fm.values():
                if isinstance(v, str):
                    tokens.update(tokenize(v))
        
        # 内容 tokens (采样以节省空间)
        content_tokens = tokenize(doc.get('content', ''))
        tokens.update(content_tokens[:500])  # 限制 tokens 数量
        
        for token in tokens:
            if len(token) >= 2:  # 过滤太短的 token
                index[token].append(filepath)
    
    return dict(index)


def calculate_tf_idf(docs: Dict) -> Dict:
    """计算 TF-IDF 权重"""
    N = len(docs)
    doc_freq = defaultdict(int)
    tf_idf = {}
    
    # 计算文档频率
    for filepath, doc in docs.items():
        tokens = set(tokenize(doc.get('content', '')))
        for token in tokens:
            doc_freq[token] += 1
    
    # 计算 TF-IDF
    for filepath, doc in docs.items():
        content = doc.get('content', '')
        tokens = tokenize(content)
        token_count = len(tokens)
        
        if token_count == 0:
            continue
            
        term_freq = defaultdict(int)
        for t in tokens:
            term_freq[t] += 1
        
        tf_idf[filepath] = {}
        for token, count in term_freq.items():
            tf = count / token_count
            idf = math.log(N / (1 + doc_freq[token]))
            tf_idf[filepath][token] = tf * idf
    
    return tf_idf


def index_file(filepath: Path, base_path: Path) -> Optional[Dict]:
    """索引单个文件"""
    try:
        stat = filepath.stat()
        
        # 跳过大文件
        if stat.st_size > MAX_FILE_SIZE:
            return None
        
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        rel_path = str(filepath.relative_to(base_path))
        
        doc = {
            'path': rel_path,
            'size': stat.st_size,
            'mtime': stat.st_mtime,
            'hash': get_file_hash(filepath),
            'content': content[:10000],  # 只存储前 10k 字符
        }
        
        # Markdown 特殊处理
        if filepath.suffix.lower() == '.md':
            doc['frontmatter'] = extract_frontmatter(content)
            doc['headings'] = extract_headings(content)
        
        return doc
        
    except Exception as e:
        print(f"Warning: Failed to index {filepath}: {e}")
        return None


def should_include(filepath: Path, include_types: List[str], exclude_patterns: List[str]) -> bool:
    """检查文件是否应被索引"""
    # 检查文件类型
    if filepath.suffix.lstrip('.').lower() not in include_types:
        return False
    
    # 检查排除模式
    path_str = str(filepath)
    for pattern in exclude_patterns:
        if pattern in path_str:
            return False
    
    return True


def build_index(
    root_path: str,
    output_path: str = None,
    types: List[str] = None,
    exclude: List[str] = None,
    incremental: bool = True
) -> Dict:
    """构建文档索引"""
    
    root = Path(root_path).resolve()
    types = types or DEFAULT_TYPES
    exclude = exclude or DEFAULT_EXCLUDE
    
    # 加载已有索引（增量更新）
    existing_index = {}
    if incremental and output_path and Path(output_path).exists():
        with open(output_path, 'r') as f:
            existing_index = json.load(f)
    
    existing_docs = existing_index.get('docs', {})
    
    # 扫描文件
    docs = {}
    file_count = 0
    updated_count = 0
    
    for filepath in root.rglob('*'):
        if not filepath.is_file():
            continue
        
        if not should_include(filepath, types, exclude):
            continue
        
        rel_path = str(filepath.relative_to(root))
        file_count += 1
        
        # 检查是否需要更新
        if rel_path in existing_docs:
            existing = existing_docs[rel_path]
            if filepath.stat().st_mtime <= existing.get('mtime', 0):
                docs[rel_path] = existing
                continue
        
        # 索引文件
        doc = index_file(filepath, root)
        if doc:
            docs[rel_path] = doc
            updated_count += 1
    
    # 构建倒排索引
    inverted = build_inverted_index(docs)
    
    # 构建 TF-IDF（可选）
    # tf_idf = calculate_tf_idf(docs)
    
    index = {
        'version': '1.0',
        'root': str(root),
        'created': datetime.now().isoformat(),
        'stats': {
            'total_files': file_count,
            'indexed_files': len(docs),
            'updated_files': updated_count
        },
        'docs': docs,
        'inverted': inverted,
        # 'tf_idf': tf_idf  # 可选，会增加索引大小
    }
    
    # 保存索引
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        print(f"Index saved to {output_path}")
    
    print(f"Indexed {len(docs)} files ({updated_count} updated)")
    
    return index


def main():
    parser = argparse.ArgumentParser(description='Build document search index')
    parser.add_argument('path', help='Root directory to index')
    parser.add_argument('--output', '-o', default='index.json', help='Output index file')
    parser.add_argument('--types', '-t', help='File types to index (comma-separated)')
    parser.add_argument('--exclude', '-e', help='Patterns to exclude (comma-separated)')
    parser.add_argument('--full', action='store_true', help='Full rebuild (ignore existing index)')
    
    args = parser.parse_args()
    
    types = args.types.split(',') if args.types else None
    exclude = args.exclude.split(',') if args.exclude else None
    
    build_index(
        args.path,
        output_path=args.output,
        types=types,
        exclude=exclude,
        incremental=not args.full
    )


if __name__ == '__main__':
    main()
