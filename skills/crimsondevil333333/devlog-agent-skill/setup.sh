#!/bin/bash
# setup.sh - Ensure dev-log-cli is installed for the DevLog Skill

if ! command -v devlog &> /dev/null
then
    echo "devlog not found. Checking for pipx..."
    if ! command -v pipx &> /dev/null
    then
        echo "pipx not found. Attempting to install pipx..."
        python3 -m pip install --user pipx
        python3 -m pipx ensurepath --force
        export PATH="$PATH:$HOME/.local/bin"
        
        if ! command -v pipx &> /dev/null
        then
            echo "Error: Failed to install pipx automatically."
            echo "Please install it manually: https://github.com/pypa/pipx#install-pipx"
            exit 1
        fi
    fi
    
    echo "Installing dev-log-cli via pipx..."
    pipx install dev-log-cli
    
    if command -v devlog &> /dev/null
    then
        echo "✓ dev-log-cli successfully installed and verified!"
    else
        echo "Error: devlog command still not found after installation. Please check your PATH."
        exit 1
    fi
else
    echo "✓ devlog is already installed."
fi
