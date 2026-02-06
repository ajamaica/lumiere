# Triple Memory System with Baidu Embedding

A comprehensive memory architecture combining three complementary systems for maximum context retention across sessions, with full privacy protection using Baidu Embedding technology.

## 🚀 Features

- **Three-Tier Memory Architecture** - Combines Baidu Embedding, Git-Notes, and File Search
- **Privacy Focused** - All vector storage local with Baidu API calls
- **Chinese Language Optimized** - Better semantic understanding for Chinese
- **Branch-Aware Storage** - Git-based memory isolation per branch
- **Auto-Recall & Capture** - Automatic memory injection and storage
- **Entity Extraction** - Smart topic and concept recognition

## 🎯 Use Cases

- **Persistent Context** - Maintain conversation history across sessions
- **Decision Tracking** - Remember user decisions and preferences
- **Knowledge Management** - Store and retrieve information semantically
- **Task Management** - Track ongoing tasks and progress
- **Learning Retention** - Remember learned information from conversations

## 📋 Prerequisites

- Clawdbot installation
- Baidu Qianfan API credentials (API Key and Secret Key) - *Optional, without these the system will operate in degraded mode*
- Git for branch-aware memory
- Python 3.8+

## 🛠️ Installation

### Method 1: Using ClawdHub
```bash
clawdhub install triple-memory-baidu-embedding
```

### Method 2: Manual Installation
```bash
# Copy the skill to your skills directory
cp -r /path/to/triple-memory-baidu-embedding ~/clawd/skills/
```

### Configuration
Set your Baidu API credentials (optional, but required for full functionality):
```bash
export BAIDU_API_STRING='your_bce_v3_api_string'
export BAIDU_SECRET_KEY='your_secret_key'
```

**Note**: Without API credentials, the system operates in degraded mode using only Git-Notes and file system search.

## 📚 Usage

### Initialization
The system can be integrated with Clawdbot's startup hooks for automatic initialization.

### Hook Integration (Recommended)
To integrate with Clawdbot's startup hook system, configure the memory-boot-loader hook to use the session initialization script:

1. The hook will automatically run `/root/clawd/session-init-triple-baidu.sh` on gateway startup
2. This initializes all three memory layers simultaneously
3. Ensures memory system is ready when the gateway starts

### Session Start (Automatic)
The system automatically syncs at session start:
```bash
# This runs automatically
python3 skills/git-notes-memory/memory.py -p $WORKSPACE sync --start
```

### Manual Session Initialization
```bash
# Run manually to initialize the session
bash /root/clawd/session-init-triple-baidu.sh
```

### Memory Operations
The system handles memory operations automatically:
- **Auto-Store**: When you say "remember this" or "I prefer..."
- **Auto-Recall**: When relevant past information is needed
- **Manual Operations**: Use Git-Notes directly for advanced features

### Manual Git-Notes Operations
```bash
# Remember something important
python3 skills/git-notes-memory/memory.py -p $WORKSPACE remember \
  '{"decision": "Use PostgreSQL", "reason": "Team expertise"}' \
  -t architecture,database -i h

# Search for information
python3 skills/git-notes-memory/memory.py -p $WORKSPACE search "database choice"

# Get information about a topic
python3 skills/git-notes-memory/memory.py -p $WORKSPACE get "preferences"
```

## 🏗️ Architecture

### Three-Tier Design
1. **Baidu Embedding Layer** - Semantic search and auto-recall (requires API credentials)
2. **Git-Notes Layer** - Structured, branch-aware storage (always available)
3. **File System Layer** - Persistent workspace documents (always available)

**Degraded Mode**: When API credentials are not provided, the system operates using only Git-Notes and File System layers.

### Data Flow
```
User Input
    ↓
Baidu Embedding Auto-Recall (relevant memories, if API credentials available)
    ↓
Response Generation (with available memory systems)
    ↓
Baidu Embedding Auto-Capture (new memories, if API credentials available)
    ↓
Git-Notes Storage (structured data)
    ↓
File System (persistent docs)
```

**In Degraded Mode** (without API credentials):
```
User Input
    ↓
Git-Notes and File System Search (relevant memories)
    ↓
Response Generation (with available memory systems)
    ↓
Git-Notes Storage (structured data)
    ↓
File System (persistent docs)
```

## 🔧 Configuration

### Environment Variables
```bash
# Baidu Qianfan API credentials
export BAIDU_API_STRING='your_bce_v3_api_string'
export BAIDU_SECRET_KEY='your_secret_key'
```

### Memory Settings
The skill works with Clawdbot's built-in memory configuration.

## 📊 Performance

- **Search Speed**: ~50-100ms for semantic searches
- **Storage**: Local SQLite database (~1MB per 1000 memories)
- **API Latency**: Depends on Baidu API response time
- **Chinese Accuracy**: Enhanced semantic understanding for Chinese

## 🔐 Privacy & Security

- **Local Storage**: All memories stored in local SQLite
- **Controlled API Calls**: Only Baidu API for embeddings
- **No External Sharing**: Memories never leave your system
- **Branch Isolation**: Memories separated by git branch

## 🔄 Migration from Original Triple Memory

If migrating from the original Triple Memory:
1. Install this skill
2. Configure Baidu API credentials
3. Disable original if desired
4. The system will continue to work with existing Git-Notes memories

## 🤝 Contributing

Contributions are welcome! Please submit issues and pull requests to improve this skill.

### Development Setup
```bash
# Clone the repository
git clone <repository-url>

# Install for development
cd triple-memory-baidu-embedding
clawdhub install --dev
```

## 📄 License

Based on the original Triple Memory system by Clawdbot Team. Modified to use Baidu Embedding for enhanced privacy and Chinese language support.

## 🆘 Support

For support, please:
1. Check the documentation
2. Review the original Triple Memory documentation
3. Ensure Baidu API credentials are properly configured
4. Verify Git is properly installed for branch-aware features

## 🙏 Acknowledgments

- Original Triple Memory system by Clawdbot Team
- Baidu Qianfan API for embedding services
- Git-Notes Memory system for structured storage
- Memory-Baidu-Embedding-DB for vector storage