# Document Creator with Auto-Upload

An integrated document creation skill that supports creating Word documents (DOCX) and PowerPoint presentations (PPTX), with automatic upload to OSS and URL return.

## 🚀 Features

- ✅ **Dual Format Support**: DOCX and PPTX document creation
- ✅ **Auto Upload**: Automatically uploads to OSS and returns URL
- ✅ **Smart Key Management**: Environment variable first, config file backup
- ✅ **Professional Formatting**: Supports titles, lists, tables, etc.
- ✅ **Error Handling**: Complete exception capture and user-friendly prompts

## 📦 Installation

### Method 1: Install via OpenClaw

```bash
openclaw skills install /path/to/document-creator-skill
```

### Method 2: Manual Installation

```bash
cd skills/document-creator
chmod +x install.sh
./install.sh
```

## ⚙️ API Key Configuration

### Method 1: Environment Variable (Recommended)

```bash
export SOPH_API_KEY="your-api-key-here"
```

### Method 2: OpenClaw Config File

Ensure `~/.openclaw/openclaw.json` contains:

```json
{
  "models": {
    "providers": {
      "sophnet": {
        "apiKey": "your-api-key-here"
      }
    }
  }
}
```

## 📝 Usage

### As OpenClaw Skill

In OpenClaw session:

```
Create document docx --title "Report Title" --content "Content"
```

Or:

```
Create presentation pptx --title "Presentation" --slides 5
```

### Command Line Usage

#### Create Word Document
```bash
python document_creator_skill.py docx --title "Document Title" --content "Document content"
```

#### Create PowerPoint Presentation
```bash
python document_creator_skill.py pptx --title "Presentation" --slides 5
```

#### Advanced Usage
```bash
# Specify author
python document_creator_skill.py docx --title "Report" --content "Content" --author "John Doe"

# No upload (create local file only)
python document_creator_skill.py docx --title "Test" --upload False
```

## 📊 Parameter Description

### Common Parameters
- `type`: Document type (docx/pptx, required)
- `title`: Document title (required)
- `upload`: Auto upload (default true)

### DOCX Specific Parameters
- `content`: Document content (supports Markdown format)
- `author`: Author name (default "OpenClaw Assistant")

### PPTX Specific Parameters
- `slides`: Number of slides (default 5)

## 🎯 Output Format

Success returns JSON format result:

```json
{
  "success": true,
  "filename": "Document_Title_20260204_120000.docx",
  "url": "https://oss-upload-temp.sophnet.com/...",
  "message": "DOCX document created and uploaded successfully"
}
```

Please note that the URL returned to the user must be complete, containing all parts including the signature and any other components.

## 📁 File Structure

```
document-creator/
├── SKILL.md              # Skill description
├── package.json          # Skill configuration
├── document_creator.py   # Full feature script
├── document_creator_skill.py  # OpenClaw Skill interface
├── install.sh            # Installation script
├── test_integration.py   # Integration test
└── README.md             # Documentation
```

## 🧪 Testing

Run test script to check functionality:

```bash
python test_integration.py
```

## 🔧 Dependencies

- Python 3.7+
- python-docx (Word document support)
- python-pptx (PowerPoint support)
- requests (network requests)

## ⚠️ Notes

- Ensure network connection for file upload
- Upload links valid for 24 hours
- Large files may take longer to upload
- Recommended to use in stable network environment

## 🔄 Compatibility with Existing Skills

This skill integrates functionality from:
- **docx skill**: Word document creation and editing
- **ppt skill**: PowerPoint presentation creation
- **file-upload skill**: File upload and URL return

Maintains core functionality of original skills while adding auto-upload and unified interface.

## 📞 Technical Support

If issues occur, check:
1. API key configuration
2. Network connection
3. Dependency library installation
4. File permissions