#!/bin/bash
PASS=0
TESTS=0

count_test() {
    TESTS=$((TESTS+1))
    if eval "$1"; then
        PASS=$((PASS+1))
    fi
}

echo "🥋 Cobra Claw Tests"
echo "=================================="

# Core skill files
count_test "[ -f SKILL.md ]"
count_test "[ -f PATTERNS.md ]"
count_test "[ -f CATEGORIES.md ]"
count_test "[ -f TEMPLATE.md ]"

# Enhancement files
count_test "[ -f COBRA-KAI.md ]"
count_test "[ -f FLAVORS.md ]"
count_test "[ -f PROMPTS.md ]"
count_test "[ -f QUICK-REF.md ]"

# Self-improvement
count_test "[ -f shell-claw-qmd.md ]"

echo "=================================="
echo "🥋 $PASS / $TESTS passed"
echo ""

[ $PASS -eq $TESTS ] && echo "✅ All tests pass — Strike first." && exit 0 || echo "❌ Some failed — Strike harder." && exit 1
