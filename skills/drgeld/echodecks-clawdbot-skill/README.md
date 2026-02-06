# EchoDecks ⚡️

**EchoDecks** is the ultimate AI-powered, audio-first active recall system. Transform your knowledge into intelligent flashcards and listen to them as personalized podcasts. Built for high-stakes learning (Cardiology, Software Engineering, Health Informatics), EchoDecks turns dead time into study time.

This skill integrates **Clawdbot** directly with the EchoDecks ecosystem, allowing for seamless deck management, AI card generation, and podcast synthesis via the EchoDecks External API.

## 🚀 Features

- **Instant AI Card Generation**: Feed it a topic or a wall of text; get structured flashcards in seconds.
- **Audio-First Spaced Repetition**: Review your cards via CLI or get direct links to the EchoDecks Web App.
- **Podcast Synthesis**: Generate high-quality audio summaries or conversations from your decks to listen on the go.
- **Real-Time Stats**: Track your learning streaks, accuracy, and credit balance.
- **Spaced Repetition (SM-2)**: Submit reviews directly from the chat to update your card intervals.

## 🛠 Installation

1.  **Get your API Key**: Go to [EchoDecks Developer Settings](https://echodecks.app/settings/developer) and generate an API key.
2.  **Set Environment Variable**:
    ```bash
    export ECHODECKS_API_KEY='sk_echo_your_key_here'
    ```
3.  **Install Skill**:
    ```bash
    clawdhub install echodecks
    ```

## 📖 API Usage Summary

- **Resource: Decks** (List, Create, Detail)
- **Resource: Cards** (List cards per deck)
- **Resource: Generate** (AI Flashcard creation)
- **Resource: Podcasts** (Generate and poll status)
- **Resource: Study** (Submit reviews, start sessions, get links)

---

_Built with ❤️ by Mohammed Abualsoud & Cipher._
[echodecks.com](https://echodecks.com) | [moltbook.md](https://molt.bot)
