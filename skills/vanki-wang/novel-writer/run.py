import os, sys, subprocess, re, yaml
from pathlib import Path

CONFIG = Path.home() / “.openclaw” / “novel_config.yaml”

if not CONFIG.exists():
    print(“❌ 请先创建 ~/.openclaw/novel_config.yaml”)
    sys.exit(1)

with open(CONFIG, “r”, encoding=“utf-8”) as f:
    cfg = yaml.safe_load(f)

vault = cfg[“obsidian_vault”]
model = cfg.get(“ollama_model”, “qwen3:latest”)
ch_dir = os.path.join(vault, “03_剧情草稿”)
ch_num = sys.argv[1].zfill(2)
prompt = sys.argv[2]

full_prompt = f“生活化现代仙侠《fangcunzhijian》，主角陆玄高中毕业，能力微弱。禁止系统/金光。写第{ch_num}章：{prompt}。600字，结尾留悬念。”
print(f“⏳ 生成第{ch_num}章...”)
res = subprocess.run([“ollama”, “run”, model, full_prompt], capture_output=True, text=True, encoding=“utf-8”, timeout=180)
if res.returncode != 0: raise Exception(res.stderr)

content = res.stdout.strip()
# 自动加链接 (请确认 `characters` 字典是否需要填充)
# for name, link in characters.items():
#     content = re.sub(name, link, content)

safe_title = re.sub(r'[\/:*?”<>|]‘, “”, prompt[:30])
filepath = os.path.join(ch_dir, f“第{ch_num}章_{safe_title}.md”)
os.makedirs(ch_dir, exist_ok=True)

with open(filepath, “w”, encoding=“utf-8”) as f:
    f.write(f“””---
title: 第{ch_num}章 {prompt}
tags: #AI生成 #待润色
---
{content}
“””)

# Git 提交
try:
    subprocess.run([“git”, “-C”, vault, “add”, “.”], check=True)
    subprocess.run([“git”, “-C”, vault, “commit”, “-m”, f“feat: 第{ch_num}章”], check=True)
except:
    pass

print(f“✅ 草稿完成！文件：{os.path.basename(filepath)}”)