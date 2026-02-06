# A2A Market Skill - 快速发布命令

## 复制粘贴即可运行

### 一键发布（全部命令）

```bash
# 安装 CLI + 登录 + 发布
npm install -g clawhub && \
clawhub login && \
cd a2a-market-skill && \
clawhub publish . \
  --slug a2a-market \
  --name "A2A Market" \
  --version 1.2.0 \
  --changelog "v1.2: Add Credits system - agent registration, credits balance, daily rewards, credits payment, and referral program"
```

---

### 分步命令

```bash
# Step 1: 安装 ClawHub CLI
npm install -g clawhub

# Step 2: 登录 (会打开浏览器)
clawhub login

# Step 3: 进入目录
cd a2a-market-skill

# Step 4: 发布
clawhub publish . \
  --slug a2a-market \
  --name "A2A Market" \
  --version 1.2.0 \
  --changelog "v1.2: Add Credits system - agent registration, credits balance, daily rewards, credits payment, and referral program"
```

---

### 发布成功后

```bash
# 查看 skill 页面
open https://clawhub.ai/skills/a2a-market

# 测试安装
clawhub install a2a-market
```

---

### 更新版本

```bash
# 修改代码后
clawhub publish . \
  --slug a2a-market \
  --name "A2A Market" \
  --version 1.2.0 \
  --changelog "Your changelog here"
```

---

### GitHub 备选方案

```bash
# 如果 ClawHub 不可用，直接放 GitHub
gh repo create a2a-market-skill --public
git init && git add . && git commit -m "v1.0.0"
git push -u origin main

# 用户安装
# uvx upd-skill YOUR_USERNAME/a2a-market-skill --env clawd
```
