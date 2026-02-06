#!/bin/bash
# StepFun CLI for OpenRouter

API_KEY="${OPENROUTER_API_KEY:-$OPENROUTER_API_KEY}"
DEFAULT_MODEL="${STEPFUN_DEFAULT_MODEL:-stepfun/step-3.5-flash:free}"

show_help() {
    echo "Usage: stepfun-cli [options] 'prompt'"
    echo ""
    echo "Options:"
    echo "  --reasoning      Show reasoning process"
    echo "  --model MODEL    Use specific model"
    echo "  --image PATH     Include image (multimodal)"
    echo "  --temperature N  Set temperature (0-1)"
    echo "  --max-tokens N   Max tokens in response"
    echo "  --help           Show this help"
    echo ""
    echo "Examples:"
    echo "  stepfun-cli 'Hello!'"
    echo "  stepfun-cli --reasoning 'Explain quantum computing'"
}

main() {
    local reasoning=""
    local model="$DEFAULT_MODEL"
    local image=""
    local temperature="0.7"
    local max_tokens=""
    local prompt=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reasoning) reasoning="true"; shift ;;
            --model) model="$2"; shift 2 ;;
            --image) image="$2"; shift 2 ;;
            --temperature) temperature="$2"; shift 2 ;;
            --max-tokens) max_tokens="$2"; shift 2 ;;
            --help) show_help; exit 0 ;;
            *) prompt="$1"; shift ;;
        esac
    done
    
    if [[ -z "$prompt" ]]; then
        echo "Error: No prompt provided"
        show_help
        exit 1
    fi
    
    if [[ -z "$API_KEY" ]]; then
        echo "Error: OPENROUTER_API_KEY not set"
        exit 1
    fi
    
    # Build request
    local content="$prompt"
    if [[ -n "$reasoning" ]]; then
        content="Think step by step and show your reasoning: $prompt"
    fi
    
    # Create JSON payload
    local payload="{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"$content\"}],\"temperature\":$temperature"
    if [[ -n "$max_tokens" ]]; then
        payload="$payload,\"max_tokens\":$max_tokens"
    fi
    payload="$payload}"
    
    # Make request
    curl -s https://openrouter.ai/api/v1/chat/completions \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" | jq -r '.choices[0].message.content'
}

main "$@"
