#!/bin/bash

set -ueo pipefail

text=${1:-"The quick brown fox jumps over the lazy dog"}

outdir=${2:-"$(mktemp -d)"}
mkdir -p "${outdir}"
fmt=${3:-"wav"}
output="${outdir}/speech.${fmt}"

# customize these on demand
instruct="AI talking to a human"
gender="female"
voice="af_heart"

# models: https://github.com/Blaizzy/mlx-audio?tab=readme-ov-file#text-to-speech-tts
model=mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16
port=${MLX_AUDIO_SERVER_PORT:-8899}

data=$(cat <<EOF
{
"instruct": "${instruct}",
"voice": "${voice}",
"gender": "${gender}",
"response_format": "${fmt}",
"model": "${model}",
"input": "${text}"
}
EOF
)

# echo "${data}"

curl -sS -X POST http://localhost:${port}/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d "${data}" --output "${output}"

# keep output clean, just audio path
echo "${output}"
