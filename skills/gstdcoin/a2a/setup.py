from setuptools import setup, find_packages

setup(
    name="gstd_a2a",
    version="1.1.0",
    description="GSTD Autonomous Agent Protocol SDK",
    author="GSTD Foundation",
    packages=find_packages(where="python-sdk"),
    package_dir={"": "python-sdk"},
    install_requires=[
        "requests",
        "mcp",
        "pydantic",
        "tonsdk",
        "pynacl",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.9',
    entry_points={
        'console_scripts': [
            'gstd-a2a-mcp=gstd_a2a.mcp_server:mcp.run',
        ],
    },
)
