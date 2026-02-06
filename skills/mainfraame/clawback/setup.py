#!/usr/bin/env python3
"""
ClawBack - Congressional Trade Mirror Bot
Setup script for pip installation
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="clawback",
    version="1.1.0",
    author="Dayne",
    author_email="",
    description="Mirror congressional stock trades with automated broker execution",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/openclaw/clawback",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Financial and Insurance Industry",
        "Topic :: Office/Business :: Financial :: Investment",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
        "requests-oauthlib>=1.3.1",
        "python-dotenv>=1.0.0",
        "schedule>=1.2.0",
        "yfinance>=0.2.28",
        "pdfplumber>=0.10.2",
        "selenium>=4.15.0",
        "webdriver-manager>=4.0.1",
        "peewee>=3.17.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "ruff>=0.3.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "clawback=clawback.cli:main",
        ],
    },
    include_package_data=True,
    package_data={
        "clawback": ["*.md", "*.json"],
    },
    project_urls={
        "Bug Reports": "https://github.com/openclaw/clawback/issues",
        "Source": "https://github.com/openclaw/clawback",
        "Documentation": "https://github.com/openclaw/clawback/blob/main/README.md",
    },
)