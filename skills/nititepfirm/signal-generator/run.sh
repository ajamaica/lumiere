#!/bin/bash
# Signal Generator Runner Script

# Find Python environment
if [ -f "/root/quant-trading-bot/venv/bin/python3" ]; then
    PYTHON="/root/quant-trading-bot/venv/bin/python3"
else
    PYTHON="python3"
fi

# Run signal generator
cd "$(dirname "$0")"
$PYTHON signal_generator.py

# Exit with signal generator's exit code
exit $?
