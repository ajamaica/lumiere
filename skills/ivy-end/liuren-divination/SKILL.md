---
name: liuren
description: Traditional Chinese "Xiao Liu Ren" divination based on current lunar time.
metadata: { 'clawdbot': { 'emoji': '⛩️', 'always': true, 'requires': { 'bins': ['node'] } } }
---

# 小六壬 (Liu Ren) ⛩️

基于当前农历时间（月、日、时）的快速起卦工具。

## Usage

Ask the agent to perform a divination:

- "起一卦"
- "算算现在运势"
- "小六壬"

The skill runs a Node.js script to calculate the lunar date and the corresponding "Liu Ren" sign.

## Script

The logic resides in `liuren.js`.
