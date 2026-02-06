# 专利助手 - Patent Assistant

帮助研发人员撰写专利技术交底书，并进行专利检索。

## 功能

- **交底书生成**：将口语化技术描述转化为结构化交底书
- **专利检索**：基于 Google Patents 进行相关专利检索
- **相似度分析**：分析检索结果与技术方案的相似度

## 安装

无需额外安装，使用 Python 3.8+ 即可。

## 使用

### 专利检索

```bash
# 基本检索
python scripts/patent_search.py "人工智能 代码生成"

# 指定国家和数量
python scripts/patent_search.py "机器学习 图像识别" -c US -n 30

# 带相似度分析
python scripts/patent_search.py "自然语言处理 文本分类" -a

# JSON 格式输出
python scripts/patent_search.py "深度学习 推荐系统" -f json
```

### 交底书模板

```bash
# 生成交底书模板
python scripts/generate_disclosure.py "我的技术方案描述"

# 从文件读取
python scripts/generate_disclosure.py -i tech_description.txt -o disclosure.md
```

## 注意事项

1. 生成的交底书仅供参考，需要发明人审核补充
2. 专利检索结果不能替代正式查新报告
3. 权利要求书建议由专利代理人撰写

## License

MIT
