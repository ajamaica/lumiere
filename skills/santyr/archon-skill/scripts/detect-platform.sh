#!/bin/bash
# Detect platform and set appropriate commands
# Source this in other scripts: source "$(dirname "$0")/detect-platform.sh"

detect_platform() {
    case "$(uname -s)" in
        Linux*)     
            PLATFORM="linux"
            DOCKER_CMD="docker"
            STAT_SIZE="stat -c%s"
            CHECKSUM_CMD="sha256sum"
            ;;
        Darwin*)    
            PLATFORM="macos"
            DOCKER_CMD="docker"
            STAT_SIZE="stat -f%z"
            CHECKSUM_CMD="shasum -a 256"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            PLATFORM="windows"
            DOCKER_CMD="docker"
            STAT_SIZE="stat -c%s"  # Git Bash provides GNU stat
            CHECKSUM_CMD="sha256sum"
            ;;
        *)          
            PLATFORM="unknown"
            DOCKER_CMD="docker"
            STAT_SIZE="stat -c%s"
            CHECKSUM_CMD="sha256sum"
            ;;
    esac
    
    export PLATFORM DOCKER_CMD STAT_SIZE CHECKSUM_CMD
}

# Auto-detect on source
detect_platform
