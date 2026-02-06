#!/bin/bash
# Hue Session Hooks - Add these to your ~/.zshrc or ~/.bash_profile

export PATH="$PATH:/Users/jesse/clawd/skills/philips-hue"

# Function to call when Clawdbot starts thinking
clawdbot-thinking() {
    hue thinking 5 >/dev/null 2>&1 &
}

# Function to call when Clawdbot is done
clawdbot-done() {
    hue done 5 >/dev/null 2>&1 &
}

# Optional: Auto-trigger on certain commands
alias ask='clawdbot-thinking; echo "🔴 Thinking light ON - What would you like to ask?"'
