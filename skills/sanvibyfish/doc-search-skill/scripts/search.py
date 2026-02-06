#!/usr/bin/env python3
"""
文档搜索器
支持多策略搜索、上下文返回、评分排序
"""

import os
import re
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict

# 搜索权重
WEIGHTS = {
    'filename_exact': 100,
    'filename_contains': 80,
    'title': 70,
    'frontmatter': 60,
    'heading': 50,
    'content': 40,
}

DEFAULT_TYPES = ['md', 'txt', 'rst', 'py', 'js', 'ts', 'yaml', 'yml', 'json']
DEFAULT_EXCLUDE = ['.git', 'node_modules', '__pycache__', '.venv', 'venv']


@dataclass
class Match:
    """单个匹配项"""
    type: str
    line: int
    content: str
    context: List[str]


@dataclass
class SearchResult:
    """搜索结果"""
    file: str
    score: int
    matches: List[Match]


def tokenize(text: str) -> List[str]:
    """简单分词"""
    words = re.findall(r'[a-zA-Z0-9_]+', text.lower())
    chinese = re.findall(r'[\u4e00-\u9fff]+', text)
    for c in chinese:
        words.extend(list(c))
    return words


def normalize_query(query: str) -> Tuple[str, List[str]]:
    """标准化查询"""
    query_lower = query.lower().strip()
    tokens = tokenize(query)
    return query_lower, tokens


def get_context_lines(lines: List[str], line_num: int, context: int = 2) -> List[str]:
    """获取上下文行"""
    start = max(0, line_num - context - 1)
    end = min(len(lines), line_num + context)
    return lines[start:end]


class DocSearch:
    """文档搜索器"""
    
    def __init__(
        self,
        path: str = None,
        index_path: str = None,
        types: List[str] = None,
        exclude: List[str] = None
    ):
        self.path = Path(path).resolve() if path else None
        self.types = types or DEFAULT_TYPES
        self.exclude = exclude or DEFAULT_EXCLUDE
        self.index = None
        
        if index_path and Path(index_path).exists():
            with open(index_path, 'r') as f:
                self.index = json.load(f)
            self.path = Path(self.index.get('root', path or '.'))
    
    def should_include(self, filepath: Path) -> bool:
        """检查文件是否应被搜索"""
        if filepath.suffix.lstrip('.').lower() not in self.types:
            return False
        path_str = str(filepath)
        for pattern in self.exclude:
            if pattern in path_str:
                return False
        return True
    
    def search_in_file(
        self,
        filepath: Path,
        query: str,
        query_tokens: List[str],
        context_lines: int = 2
    ) -> Optional[SearchResult]:
        """在单个文件中搜索"""
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception:
            return None
        
        lines = content.split('\n')
        matches = []
        score = 0
        filename = filepath.name.lower()
        stem = filepath.stem.lower()
        query_lower = query.lower()
        
        # 1. 文件名匹配
        if query_lower == stem:
            score += WEIGHTS['filename_exact']
            matches.append(Match(
                type='filename_exact',
                line=0,
                content=filepath.name,
                context=[]
            ))
        elif query_lower in filename:
            score += WEIGHTS['filename_contains']
            matches.append(Match(
                type='filename_contains',
                line=0,
                content=filepath.name,
                context=[]
            ))
        
        # 2. Markdown 特殊处理
        if filepath.suffix.lower() == '.md':
            # Frontmatter 匹配
            fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
            if fm_match:
                fm_content = fm_match.group(1).lower()
                if query_lower in fm_content:
                    score += WEIGHTS['frontmatter']
                    # 找到具体匹配的行
                    for i, line in enumerate(fm_content.split('\n')):
                        if query_lower in line:
                            matches.append(Match(
                                type='frontmatter',
                                line=i + 2,
                                content=lines[i + 1] if i + 1 < len(lines) else line,
                                context=get_context_lines(lines, i + 2, context_lines)
                            ))
                            break
            
            # 标题匹配
            for i, line in enumerate(lines, 1):
                if re.match(r'^#{1,6}\s+', line):
                    if query_lower in line.lower():
                        level = len(re.match(r'^(#+)', line).group(1))
                        weight = WEIGHTS['heading'] if level > 1 else WEIGHTS['title']
                        score += weight
                        matches.append(Match(
                            type='title' if level == 1 else 'heading',
                            line=i,
                            content=line,
                            context=get_context_lines(lines, i, context_lines)
                        ))
        
        # 3. 正文内容匹配
        content_matches = 0
        for i, line in enumerate(lines, 1):
            if query_lower in line.lower():
                # 跳过已经作为标题/frontmatter 匹配的
                if any(m.line == i for m in matches):
                    continue
                
                content_matches += 1
                if content_matches <= 5:  # 限制内容匹配数量
                    matches.append(Match(
                        type='content',
                        line=i,
                        content=line.strip(),
                        context=get_context_lines(lines, i, context_lines)
                    ))
        
        if content_matches > 0:
            # 内容匹配分数，多次匹配有加成但递减
            score += WEIGHTS['content'] * min(content_matches, 3)
        
        if not matches:
            return None
        
        rel_path = str(filepath.relative_to(self.path)) if self.path else str(filepath)
        
        return SearchResult(
            file=rel_path,
            score=score,
            matches=matches
        )
    
    def search_with_index(
        self,
        query: str,
        context_lines: int = 2,
        limit: int = 20
    ) -> List[SearchResult]:
        """使用索引搜索"""
        
        if not self.index:
            raise ValueError("No index loaded")
        
        query_lower, query_tokens = normalize_query(query)
        
        # 从倒排索引找候选文件
        candidates = set()
        inverted = self.index.get('inverted', {})
        
        for token in query_tokens:
            if token in inverted:
                candidates.update(inverted[token])
        
        # 如果没有通过 tokens 找到，回退到全部文件
        if not candidates:
            candidates = set(self.index.get('docs', {}).keys())
        
        results = []
        docs = self.index.get('docs', {})
        
        for filepath in candidates:
            if filepath not in docs:
                continue
            
            doc = docs[filepath]
            full_path = self.path / filepath
            
            if full_path.exists():
                result = self.search_in_file(
                    full_path, query, query_tokens, context_lines
                )
                if result:
                    results.append(result)
        
        # 按分数排序
        results.sort(key=lambda r: r.score, reverse=True)
        
        return results[:limit]
    
    def search_direct(
        self,
        query: str,
        context_lines: int = 2,
        limit: int = 20
    ) -> List[SearchResult]:
        """直接搜索（不使用索引）"""
        
        if not self.path:
            raise ValueError("No search path specified")
        
        query_lower, query_tokens = normalize_query(query)
        results = []
        
        for filepath in self.path.rglob('*'):
            if not filepath.is_file():
                continue
            
            if not self.should_include(filepath):
                continue
            
            result = self.search_in_file(
                filepath, query, query_tokens, context_lines
            )
            if result:
                results.append(result)
        
        # 按分数排序
        results.sort(key=lambda r: r.score, reverse=True)
        
        return results[:limit]
    
    def search(
        self,
        query: str,
        context_lines: int = 2,
        limit: int = 20
    ) -> List[SearchResult]:
        """执行搜索"""
        
        if self.index:
            return self.search_with_index(query, context_lines, limit)
        else:
            return self.search_direct(query, context_lines, limit)


def format_results(results: List[SearchResult], output_format: str = 'json') -> str:
    """格式化输出"""
    
    if output_format == 'json':
        output = {
            'total': len(results),
            'results': [asdict(r) for r in results]
        }
        return json.dumps(output, ensure_ascii=False, indent=2)
    
    elif output_format == 'simple':
        lines = []
        for r in results:
            lines.append(f"\n{r.file} (score: {r.score})")
            for m in r.matches[:3]:
                lines.append(f"  L{m.line} [{m.type}]: {m.content[:80]}")
        return '\n'.join(lines)
    
    elif output_format == 'files':
        return '\n'.join(r.file for r in results)
    
    return ''


def main():
    parser = argparse.ArgumentParser(description='Search documents')
    parser.add_argument('query', help='Search query')
    parser.add_argument('path', nargs='?', help='Directory to search')
    parser.add_argument('--index', '-i', help='Use index file instead of direct search')
    parser.add_argument('--context', '-c', type=int, default=2, help='Context lines')
    parser.add_argument('--limit', '-l', type=int, default=20, help='Max results')
    parser.add_argument('--types', '-t', help='File types (comma-separated)')
    parser.add_argument('--format', '-f', choices=['json', 'simple', 'files'], 
                        default='simple', help='Output format')
    
    args = parser.parse_args()
    
    if not args.path and not args.index:
        parser.error("Either path or --index must be specified")
    
    types = args.types.split(',') if args.types else None
    
    searcher = DocSearch(
        path=args.path,
        index_path=args.index,
        types=types
    )
    
    results = searcher.search(
        args.query,
        context_lines=args.context,
        limit=args.limit
    )
    
    print(format_results(results, args.format))


if __name__ == '__main__':
    main()
