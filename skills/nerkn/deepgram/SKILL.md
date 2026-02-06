# Deepgram CLI Skills Guide

## Tool

**@deepgram/cli** — command-line interface for Deepgram speech-to-text.

---

## Install

```bash
npm install -g @deepgram/cli
```

---

## Auth

```bash
deepgram login
```

Uses your Deepgram API key (stored locally).

---

## Core Skill: Speech → Text

### Transcribe a Local Audio File

```bash
deepgram listen prerecorded audio.wav
```

### Transcribe with Options

```bash
deepgram listen prerecorded audio.wav \
  --model nova-2 \
  --language en \
  --punctuate \
  --diarize
```

---

## Core Skill: Read / Reach Content

### From URL (remote audio)

```bash
deepgram listen prerecorded https://example.com/audio.mp3
```

### From STDIN (pipes)

```bash
cat audio.wav | deepgram listen prerecorded -
```

### From Microphone (live)

```bash
deepgram listen microphone
```

Stop with `Ctrl+C`. Congrats, you just dictated reality.

---

## Output Handling

### Save Transcript

```bash
deepgram listen prerecorded audio.wav > transcript.json
```

### Plain Text Output

```bash
deepgram listen prerecorded audio.wav --format text
```

---

## Useful Flags (Memorize These)

- `--model` – `nova-2`, `general`, etc.
- `--language` – `en`, `tr`, `de`, …
- `--punctuate` – adds punctuation
- `--diarize` – speaker separation
- `--format` – `json`, `text`, `srt`, `vtt`

---

## Typical Workflow

1. Reach content (file / URL / mic)
2. Run `deepgram listen`
3. Capture output (JSON or text)
4. Post-process (search, summarize, subtitle)

---

## Skill Summary

- CLI-based speech-to-text
- Local, remote, and live audio
- Scriptable, pipe-friendly
- Fast, accurate, no UI nonsense

Deepgram CLI: because keyboards are overrated.
