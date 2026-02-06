#!/usr/bin/env bash

set -ueo pipefail

audio=${1:-audio.mp3}
model=${2:-"mlx-community/glm-asr-nano-2512-8bit"}

# if audio is not wav, convert to wav
audio_ext="${audio##*.}"
if [[ "${audio_ext,,}" != "wav" ]]; then
  tmpdir=$(mktemp -d)
  audio_wav="${tmpdir}/audio.wav"
  ffmpeg -y -loglevel error -i "${audio}" -vn -ac 1 -ar 16000 -af loudnorm -c:a pcm_s16le "${audio_wav}"
  audio="${audio_wav}"
fi

port=${MLX_AUDIO_SERVER_PORT:-8899}
curl -sS -X POST http://localhost:${port}/v1/audio/transcriptions \
  -F "file=@${audio}" \
  -F "model=${model}" \
  | jq -r '.text'  # keep output clean, just transcript text
