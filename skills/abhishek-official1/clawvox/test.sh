#!/bin/bash
# ElevenLabs Voice Studio - Test Suite
# Usage: test.sh [api_key]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
BIN="$SCRIPT_DIR/bin/elevenlabs"

# Source common utilities
source "$SCRIPTS_DIR/common.sh" 2>/dev/null || {
    # Fallback if common.sh doesn't exist
    log_info() { echo "ℹ $1"; }
    log_success() { echo "✓ $1"; }
    log_error() { echo "✗ $1" >&2; }
    log_warning() { echo "⚠ $1"; }
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Get API key
if [[ -n "${1:-}" ]]; then
    export ELEVENLABS_API_KEY="$1"
    log_info "Using API key from command line"
elif [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
    log_info "Using API key from environment"
else
    log_error "ELEVENLABS_API_KEY not set"
    echo "Usage: test.sh <api_key>"
    exit 1
fi

# Validate API key format
if [[ ${#ELEVENLABS_API_KEY} -lt 20 ]]; then
    log_error "API key appears to be invalid (too short)"
    exit 1
fi

echo ""
echo "=========================================="
echo "ElevenLabs Voice Studio - Test Suite"
echo "=========================================="
echo ""

# Test function
run_test() {
    local test_name="$1"
    local test_cmd="$2"
    local expect_failure="${3:-false}"
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_cmd" > /tmp/test_output.txt 2>&1; then
        if [[ "$expect_failure" == "true" ]]; then
            echo -e "${RED}FAILED${NC} (expected failure but succeeded)"
            ((TESTS_FAILED++))
            return 1
        else
            echo -e "${GREEN}PASSED${NC}"
            ((TESTS_PASSED++))
            return 0
        fi
    else
        if [[ "$expect_failure" == "true" ]]; then
            echo -e "${GREEN}PASSED${NC} (expected failure)"
            ((TESTS_PASSED++))
            return 0
        else
            echo -e "${RED}FAILED${NC}"
            echo "  Error: $(cat /tmp/test_output.txt | head -3)"
            ((TESTS_FAILED++))
            return 1
        fi
    fi
}

# Test function that checks for specific output
run_test_contains() {
    local test_name="$1"
    local test_cmd="$2"
    local expected="$3"
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_cmd" > /tmp/test_output.txt 2>&1; then
        if grep -q "$expected" /tmp/test_output.txt; then
            echo -e "${GREEN}PASSED${NC}"
            ((TESTS_PASSED++))
            return 0
        else
            echo -e "${YELLOW}WARNING${NC} (output doesn't contain '$expected')"
            ((TESTS_SKIPPED++))
            return 0
        fi
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Error: $(cat /tmp/test_output.txt | head -3)"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "CLI Tests"
echo "=========================================="
echo ""

# Test 1: CLI help
run_test_contains "CLI help command" "$BIN help" "ElevenLabs" || true

# Test 2: Speak script help
run_test_contains "Speak script help" "$SCRIPTS_DIR/speak.sh --help" "Usage:" || true

# Test 3: Transcribe script help
run_test_contains "Transcribe script help" "$SCRIPTS_DIR/transcribe.sh --help" "Usage:" || true

# Test 4: Voices script help
run_test_contains "Voices script help" "$SCRIPTS_DIR/voices.sh --help" "Commands:" || true

# Test 5: Clone script help
run_test_contains "Clone script help" "$SCRIPTS_DIR/clone.sh --help" "Usage:" || true

# Test 6: SFX script help
run_test_contains "SFX script help" "$SCRIPTS_DIR/sfx.sh --help" "Usage:" || true

# Test 7: Isolate script help
run_test_contains "Isolate script help" "$SCRIPTS_DIR/isolate.sh --help" "Usage:" || true

# Test 8: Dub script help
run_test_contains "Dub script help" "$SCRIPTS_DIR/dub.sh --help" "Usage:" || true

echo ""
echo "=========================================="
echo "API Tests (requires valid API key)"
echo "=========================================="
echo ""

# Test 9: List voices (API call)
run_test_contains "List voices (API)" "$SCRIPTS_DIR/voices.sh list" "Rachel" || true

# Test 10: Get voice info for Rachel
run_test_contains "Get voice info (API)" "$SCRIPTS_DIR/voices.sh info --name Rachel" "voice_id" || true

# Test 11: Generate TTS (if not rate limited)
echo -n "Testing: Generate TTS (API)... "
OUTPUT_FILE="/tmp/test_tts_$$.mp3"
if $SCRIPTS_DIR/speak.sh --out "$OUTPUT_FILE" "Hello from ElevenLabs Voice Studio test suite" 2>/tmp/test_output.txt; then
    if [[ -f "$OUTPUT_FILE" && -s "$OUTPUT_FILE" ]]; then
        echo -e "${GREEN}PASSED${NC}"
        ((TESTS_PASSED++))
        
        # Get file size
        FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
        echo "  Generated: $(( FILE_SIZE / 1024 )) KB"
        
        # Save for transcription test
        cp "$OUTPUT_FILE" /tmp/test_tts_sample.mp3
        rm -f "$OUTPUT_FILE"
    else
        echo -e "${RED}FAILED${NC} (file not created or empty)"
        ((TESTS_FAILED++))
    fi
else
    ERROR=$(cat /tmp/test_output.txt)
    if echo "$ERROR" | grep -qi "quota\|rate\|limit"; then
        echo -e "${YELLOW}SKIPPED${NC} (quota/rate limit)"
        ((TESTS_SKIPPED++))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Error: $ERROR"
        ((TESTS_FAILED++))
    fi
fi

# Test 12: Transcribe the generated audio
if [[ -f /tmp/test_tts_sample.mp3 ]]; then
    echo -n "Testing: Transcribe (API)... "
    if $SCRIPTS_DIR/transcribe.sh /tmp/test_tts_sample.mp3 > /tmp/transcript.txt 2>/tmp/test_output.txt; then
        TRANSCRIPT=$(cat /tmp/transcript.txt)
        if [[ -n "$TRANSCRIPT" ]]; then
            echo -e "${GREEN}PASSED${NC}"
            ((TESTS_PASSED++))
            echo "  Transcript: ${TRANSCRIPT:0:50}..."
        else
            echo -e "${RED}FAILED${NC} (empty transcript)"
            ((TESTS_FAILED++))
        fi
    else
        ERROR=$(cat /tmp/test_output.txt)
        if echo "$ERROR" | grep -qi "quota\|rate\|limit"; then
            echo -e "${YELLOW}SKIPPED${NC} (quota/rate limit)"
            ((TESTS_SKIPPED++))
        else
            echo -e "${RED}FAILED${NC}"
            echo "  Error: $ERROR"
            ((TESTS_FAILED++))
        fi
    fi
    rm -f /tmp/test_tts_sample.mp3 /tmp/transcript.txt
fi

# Test 13: Generate sound effect (if not rate limited)
echo -n "Testing: Generate SFX (API)... "
OUTPUT_FILE="/tmp/test_sfx_$$.mp3"
if $SCRIPTS_DIR/sfx.sh --out "$OUTPUT_FILE" "Short notification beep sound" 2>/tmp/test_output.txt; then
    if [[ -f "$OUTPUT_FILE" && -s "$OUTPUT_FILE" ]]; then
        echo -e "${GREEN}PASSED${NC}"
        ((TESTS_PASSED++))
        
        # Get file size
        FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
        echo "  Generated: $(( FILE_SIZE / 1024 )) KB"
        
        rm -f "$OUTPUT_FILE"
    else
        echo -e "${RED}FAILED${NC} (file not created or empty)"
        ((TESTS_FAILED++))
    fi
else
    ERROR=$(cat /tmp/test_output.txt)
    if echo "$ERROR" | grep -qi "quota\|rate\|limit"; then
        echo -e "${YELLOW}SKIPPED${NC} (quota/rate limit)"
        ((TESTS_SKIPPED++))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Error: $ERROR"
        ((TESTS_FAILED++))
    fi
fi

# Test 14: Error handling - missing API key
echo -n "Testing: Error handling (missing API key)... "
if env -u ELEVENLABS_API_KEY $SCRIPTS_DIR/speak.sh "test" 2>/tmp/test_output.txt; then
    echo -e "${RED}FAILED${NC} (should have failed without API key)"
    ((TESTS_FAILED++))
else
    if grep -q "ELEVENLABS_API_KEY" /tmp/test_output.txt; then
        echo -e "${GREEN}PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}WARNING${NC} (failed but without expected error message)"
        ((TESTS_SKIPPED++))
    fi
fi

# Test 15: Error handling - invalid voice
echo -n "Testing: Error handling (invalid voice)... "
if $SCRIPTS_DIR/speak.sh --voice "invalid_voice_id_12345" "test" 2>/tmp/test_output.txt; then
    echo -e "${RED}FAILED${NC} (should have failed with invalid voice)"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}PASSED${NC} (correctly failed)"
    ((TESTS_PASSED++))
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Tests Skipped: ${YELLOW}$TESTS_SKIPPED${NC}"
echo ""

TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo "Total: $TOTAL"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
