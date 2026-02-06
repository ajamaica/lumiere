#!/bin/bash

set -ueo pipefail

# use brew to install deps if not exists
command -v ffmpeg || brew install ffmpeg
command -v git || brew install git
command -v jq || brew install jq
command -v uv || brew install uv

# clone forked repo to fix server issues, and add launchd daemon support
# repo_url="https://github.com/Blaizzy/mlx-audio"
repo_url="https://github.com/guoqiao/mlx-audio"

repo_dir=~/opt/mlx-audio

if [ -d "${repo_dir}" ]; then
    cd "${repo_dir}"
    git pull || true
else
    git clone ${repo_url} "${repo_dir}"
    cd "${repo_dir}"
fi

# install mlx-audio via source code, into its own uv venv
make pip

# install a plist file to macOS, to run mlx-audio server as a launchd daemon, for current user
# this server provides openai compatible api, on port 8899 by default. e.g.:
# https://localhost:8899/v1/audio/transcriptions
# https://localhost:8899/v1/audio/speech
# https://localhost:8899/docs
# it's exposed in LAN (--host 0.0.0.0), so other apps can also use it as api, such as spokenly. Enjoy!
# refer: https://github.com/guoqiao/mlx-audio/blob/main/install_daemon.sh
make daemon
