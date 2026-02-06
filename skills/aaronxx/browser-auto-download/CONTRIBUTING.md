# Contributing to Browser Auto Download

Thank you for your interest in contributing to Browser Auto Download! This document provides guidelines and instructions for contributing.

## 🎯 How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**Bug Report Template:**

```markdown
### Description

Clear description of the bug

### Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### Expected Behavior

What should happen

### Actual Behavior

What actually happens

### Environment

- OS: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
- Python version: [e.g., 3.14.0]
- Playwright version: [e.g., 1.40.0]
- OpenClaw version: [e.g., 1.0.0]

### Logs/Error Messages
```

### Suggesting Enhancements

**Enhancement Template:**

```markdown
### Problem or Need

What problem does this solve?

### Proposed Solution

How should it work?

### Alternatives Considered

What other approaches did you consider?

### Additional Context

Any other relevant information
```

## 🛠️ Development Setup

### Prerequisites

- Python 3.14+
- Playwright
- OpenClaw gateway

### Installation

```bash
# Clone repository
git clone https://github.com/your-repo/browser-auto-download.git
cd browser-auto-download

# Install dependencies
pip install playwright
playwright install chromium

# Add to OpenClaw skills
ln -s $(pwd) ~/.openclaw/skills/browser-auto-download
```

### Running Tests

```bash
# Test individual examples
python examples.py

# Test specific website
python scripts/auto_download.py --url "https://example.com"

# Test all shortcuts
python scripts/auto_download.py --wechat
python scripts/auto_download.py --meitu
```

## 📝 Code Style

### Python Code

- Follow PEP 8
- Use type hints
- Add docstrings to functions
- Keep functions under 50 lines when possible
- Use descriptive variable names

**Example:**

```python
def auto_download(
    url: str,
    download_button_selector: str = None,
    output_dir: str = None,
    headless: bool = False
) -> Optional[dict]:
    """
    Download file using Playwright browser automation.

    Args:
        url: Target webpage URL
        download_button_selector: Download button selector
        output_dir: Download save directory
        headless: Run in headless mode

    Returns:
        dict: File info {path, filename, size_bytes, size_mb} or None
    """
    # Implementation...
```

### Documentation

- Use clear, concise language
- Provide examples for new features
- Update README.md for user-facing changes
- Update CHANGELOG.md for version changes

## 🧪 Testing

### Test Coverage

Before submitting a PR, ensure:

1. **Existing tests pass** - All 4 test cases should succeed
2. **New tests added** - For new features, add test cases
3. **Documentation updated** - README and examples reflect changes

### Test Sites

We maintain a list of test sites:

| Site            | Type                   | Difficulty | Status |
| --------------- | ---------------------- | ---------- | ------ |
| Meitu Xiuxiu    | Auto-download          | Medium     | ✅     |
| WeChat DevTools | Button click (Chinese) | Hard       | ✅     |
| Python.org      | Direct link            | Easy       | ✅     |
| 7-Zip           | Relative path          | Medium     | ✅     |

When adding new features, test against at least 2 of these sites.

## 📦 Pull Request Process

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow conventions

### Commit Messages

Format: `<type>(<scope>): <subject>`

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `test` - Adding tests
- `refactor` - Code refactoring
- `perf` - Performance improvement

**Examples:**

```
feat(download): add support for FTP links
fix(selector): improve Chinese page detection
docs(readme): add installation instructions
```

### PR Template

```markdown
### Description

Brief description of changes

### Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

### Testing

- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Tested on Windows
- [ ] Tested on macOS
- [ ] Tested on Linux

### Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No new warnings
```

## 🎨 Design Principles

### Core Values

1. **Robustness** - Handle failures gracefully
2. **Simplicity** - Easy to understand and maintain
3. **Flexibility** - Support multiple download patterns
4. **Performance** - Fast and efficient

### Architecture

The skill uses a **tiered strategy system**:

```
Stage 1: Non-intrusive (auto-detect)
  ↓
Stage 2: Semi-intrusive (navigation)
  ↓
Stage 3: Intrusive (button clicking)
```

When adding features, consider which tier they belong to.

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

### Getting Help

- **Discord**: https://discord.gg/clawd
- **GitHub Issues**: https://github.com/your-repo/browser-auto-download/issues
- **ClawHub**: https://clawhub.com

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**
