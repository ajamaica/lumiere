---
name: hergunmac
description: Access AI-powered football match predictions from hergunmac.com. Use when the user asks about football/soccer match predictions, betting tips, match analysis, team statistics, head-to-head data, or upcoming match insights. Covers worldwide leagues with confidence scores, AI reasoning, and historical performance tracking.
---

# hergunmac - Football Prediction Engine

Access AI-powered football match predictions and analysis from [hergunmac.com](https://hergunmac.com).

## What This Skill Provides

- **Match Predictions** with confidence scores (0-100%)
- **Multiple bet types**: Match result, Over/Under, BTTS, Double Chance, Half results
- **Team Statistics**: Form, league position, key players, injuries
- **Head-to-Head Data**: Historical meetings and win/loss breakdown
- **AI Analysis**: Reasoning and key factors for each prediction

## Quick Start

1. Open browser to `https://hergunmac.com`
2. Use status filters to find matches (Yaklaşan = Upcoming, Canlı = Live, Bitti = Finished)
3. Click any match card to view detailed analysis
4. Check the 4 tabs: Öngörüler (Predictions), Genel Bakış (Overview), H2H, Takımlar (Teams)

## Navigation Reference

**Live context file:** https://www.hergunmac.com/llm.txt

Fetch the latest navigation guide directly from the site for up-to-date URL patterns, UI elements, and browser automation notes.

**Bundled reference:** [references/llm-context.md](references/llm-context.md) - Offline copy of the navigation guide

## Key Turkish Terms

| Turkish        | English             |
| -------------- | ------------------- |
| Öngörüler      | Predictions         |
| Genel Bakış    | Overview            |
| Takımlar       | Teams               |
| Yaklaşan       | Upcoming            |
| Canlı          | Live                |
| Bitti          | Finished            |
| Güven          | Confidence          |
| Maç Sonucu     | Match Result        |
| Alt/Üst        | Under/Over          |
| Karşılıklı Gol | Both Teams to Score |

## Prediction Types

- **Maç Sonucu (1X2)**: Home win, Draw, Away win
- **Alt/Üst**: Under/Over goal lines (0.5, 1.5, 2.5, 3.5)
- **Karşılıklı Gol (BTTS)**: Both teams score Yes/No
- **Çifte Şans**: Double Chance (1X, X2, 12)
- **İlk/İkinci Yarı**: First/Second half predictions

## Important Disclaimers

⚠️ **Always communicate these to users:**

1. Predictions are for **statistical information only**
2. Past performance does not guarantee future results
3. hergunmac.com is an **analysis tool**, not a betting platform
4. Users are responsible for their own decisions

## Example Queries This Skill Handles

- "What are today's football predictions?"
- "Show me upcoming matches with high confidence predictions"
- "What's the analysis for [Team A] vs [Team B]?"
- "Any good betting tips for tonight's matches?"
- "Check the head-to-head stats for the Liverpool match"
