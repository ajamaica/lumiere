# Contributing to WordPress Publisher Skill

Thank you for your interest in contributing to the WordPress Publisher Skill! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project follows a standard code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Python 3.8 or higher
- A WordPress site with REST API enabled (for testing)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/wordpress-publisher-skill.git
   cd wordpress-publisher-skill
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/wordpress-publisher-skill.git
   ```

## How to Contribute

### Types of Contributions

We welcome:

- **Bug fixes**: Fix issues and improve stability
- **New features**: Add new capabilities
- **Documentation**: Improve README, docstrings, or add examples
- **Tests**: Add or improve test coverage
- **Gutenberg blocks**: Add support for more block types
- **Performance**: Optimize code for better performance

### Before You Start

1. Check [existing issues](https://github.com/yourusername/wordpress-publisher-skill/issues) to see if your idea is already being discussed
2. For major changes, open an issue first to discuss the proposed changes
3. Ensure your contribution aligns with the project's goals

## Development Setup

### Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -r requirements-dev.txt
```

### Project Structure

```
wordpress-publisher-skill/
├── SKILL.md                    # Claude skill definition
├── README.md                   # Main documentation
├── CHANGELOG.md                # Version history
├── CONTRIBUTING.md             # This file
├── LICENSE                     # MIT License
├── requirements.txt            # Production dependencies
├── requirements-dev.txt        # Development dependencies
├── scripts/
│   ├── wp_publisher.py         # Main publisher class
│   └── content_to_gutenberg.py # Content converter
├── references/
│   └── gutenberg-blocks.md     # Block format reference
└── tests/
    ├── test_wp_publisher.py
    └── test_content_converter.py
```

### Environment Variables for Testing

Create a `.env` file (gitignored) for testing:

```bash
WP_TEST_URL=https://your-test-site.com
WP_TEST_USER=testuser
WP_TEST_PASSWORD=xxxx xxxx xxxx xxxx
```

## Coding Standards

### Python Style

We follow [PEP 8](https://pep8.org/) with these specifics:

- **Line length**: 100 characters maximum
- **Indentation**: 4 spaces
- **Quotes**: Double quotes for strings
- **Imports**: Sorted with `isort`

### Code Formatting

We use `black` for consistent formatting:

```bash
# Format all Python files
black scripts/ tests/

# Check formatting without changes
black --check scripts/ tests/
```

### Linting

We use `flake8` for linting:

```bash
flake8 scripts/ tests/
```

### Type Hints

Use type hints for all public functions:

```python
def create_post(
    self,
    title: str,
    content: str,
    status: str = "draft",
    categories: List[int] = None
) -> Dict:
    """
    Create a new post.

    Args:
        title: Post title
        content: Post content (Gutenberg blocks)
        status: Post status (draft, publish, etc.)
        categories: List of category IDs

    Returns:
        Created post dictionary
    """
    pass
```

### Docstrings

Use Google-style docstrings:

```python
def function_name(param1: str, param2: int) -> bool:
    """
    Brief description of the function.

    Longer description if needed, explaining the purpose
    and any important details.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value

    Raises:
        ValueError: Description of when this is raised
        APIError: Description of when this is raised

    Example:
        >>> result = function_name("test", 42)
        >>> print(result)
        True
    """
    pass
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=scripts --cov-report=html

# Run specific test file
pytest tests/test_wp_publisher.py

# Run specific test
pytest tests/test_wp_publisher.py::test_connection
```

### Writing Tests

```python
import pytest
from scripts.wp_publisher import WordPressPublisher

class TestWordPressPublisher:
    """Tests for WordPressPublisher class."""

    def test_connection_success(self, mock_wp):
        """Test successful connection to WordPress."""
        result = mock_wp.test_connection()
        assert "name" in result
        assert result["name"] == "testuser"

    def test_authentication_failure(self):
        """Test authentication error handling."""
        wp = WordPressPublisher(
            site_url="https://example.com",
            username="wrong",
            password="wrong"
        )
        with pytest.raises(AuthenticationError):
            wp.test_connection()
```

### Test Coverage

We aim for >80% test coverage. Check coverage with:

```bash
pytest --cov=scripts --cov-report=term-missing
```

## Pull Request Process

### Before Submitting

1. **Update documentation**: Update README, docstrings, and CHANGELOG
2. **Add tests**: Include tests for new functionality
3. **Run checks**:
   ```bash
   black --check scripts/ tests/
   flake8 scripts/ tests/
   pytest
   ```
4. **Commit messages**: Use clear, descriptive commit messages

### Commit Message Format

```
type(scope): brief description

Longer description if needed, explaining what and why.

Fixes #123
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change without feature/fix
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(converter): add support for wp:details block

Adds conversion support for the accordion/details block,
which is useful for FAQ sections.

Closes #45
```

```
fix(publisher): handle 429 rate limit responses

Add retry logic with exponential backoff when WordPress
returns 429 Too Many Requests.

Fixes #67
```

### Submitting PR

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit

3. Push to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

5. Fill out the PR template with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI-related)

### PR Review Process

1. Maintainers will review within 3-5 business days
2. Address any requested changes
3. Once approved, maintainers will merge
4. Your contribution will be noted in CHANGELOG

## Issue Guidelines

### Bug Reports

Include:

- Python version
- WordPress version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages/logs
- Minimal code example

### Feature Requests

Include:

- Use case description
- Proposed solution
- Alternative approaches considered
- Willingness to implement

### Questions

For questions:

- Check existing documentation first
- Search closed issues
- Use [Discussions](https://github.com/yourusername/wordpress-publisher-skill/discussions) for general questions

## Adding New Gutenberg Blocks

To add support for a new block type:

1. **Document the block format** in `references/gutenberg-blocks.md`:

   ````markdown
   ### New Block Name

   ```html
   <!-- wp:blockname {"attr":"value"} -->
   <div class="wp-block-blockname">Content</div>
   <!-- /wp:blockname -->
   ```
   ````

   ```

   ```

2. **Add conversion logic** in `content_to_gutenberg.py`:

   ```python
   # In markdown_to_gutenberg function
   if some_pattern_match:
       blocks.append(create_new_block(content))
   ```

3. **Create helper function**:

   ```python
   def create_new_block(content: str, **options) -> str:
       """Create a Gutenberg blockname block."""
       return (
           f'<!-- wp:blockname -->\n'
           f'<div class="wp-block-blockname">{content}</div>\n'
           f'<!-- /wp:blockname -->'
       )
   ```

4. **Add tests**:

   ```python
   def test_new_block_conversion():
       markdown = "... your test markdown ..."
       result = convert_to_gutenberg(markdown)
       assert "<!-- wp:blockname -->" in result
   ```

5. **Update documentation**

## Recognition

Contributors will be:

- Listed in CHANGELOG for their contributions
- Mentioned in release notes
- Added to CONTRIBUTORS.md (for significant contributions)

## Questions?

Feel free to:

- Open an issue with the `question` label
- Start a discussion
- Reach out to maintainers

Thank you for contributing! 🎉
