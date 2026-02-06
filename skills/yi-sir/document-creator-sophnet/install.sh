#!/bin/bash

# Document Creator Skill Installation Script

echo "Installing Document Creator Skill..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found, please install Python 3.7+"
    exit 1
fi

# Install dependencies
echo "Checking and installing dependencies..."

# Check python-docx
if ! python3 -c "import docx" &> /dev/null; then
    echo "Installing python-docx..."
    pip3 install python-docx
fi

# Check python-pptx
if ! python3 -c "import pptx" &> /dev/null; then
    echo "Installing python-pptx..."
    pip3 install python-pptx
fi

# Check requests
if ! python3 -c "import requests" &> /dev/null; then
    echo "Installing requests..."
    pip3 install requests
fi

# Set file permissions
chmod +x document_creator.py
chmod +x document_creator_skill.py
chmod +x install.sh

echo "Document Creator Skill installation completed!"
echo ""
echo "Usage:"
echo "1. Create Word document: python document_creator_skill.py docx --title "Document Title" --content "Content""
echo "2. Create PPT presentation: python document_creator_skill.py pptx --title "Presentation" --slides 5"
echo "3. Use as OpenClaw Skill"
echo ""
echo "Note: Files will be automatically uploaded to OSS and URL returned"