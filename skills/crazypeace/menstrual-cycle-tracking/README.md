# Menstrual Cycle Tracking Skill for OpenClaw

This skill enables OpenClaw agents to track, analyze, and visualize menstrual cycle data for health monitoring purposes.

## Features

- Record menstrual cycle data (bleeding level, pain, mood, etc.)
- Analyze patterns in menstrual cycles
- Generate visualizations of health trends
- Provide health insights based on collected data

## Requirements

- Python 3.x
- matplotlib
- pandas
- numpy
- json

## Installation

1. Place the skill files in the `skills/menstrual-tracking/` directory
2. Install dependencies: `pip3 install matplotlib pandas numpy`
3. Ensure the data directory exists: `mkdir -p data/`

## Usage

Users can interact with the skill by providing natural language descriptions of their menstrual symptoms, which the system will parse and store appropriately.
