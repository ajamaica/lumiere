#!/bin/bash
#
# Setup Wizard for OpenClaw Notion Skill
# Guides you through creating your first database

set -e

echo "🎯 OpenClaw Notion Skill - Setup Wizard"
echo "=========================================="
echo ""

# Check for NOTION_TOKEN
if [ -z "$NOTION_TOKEN" ]; then
    if [ -f "$HOME/.openclaw/.env" ]; then
        export $(cat "$HOME/.openclaw/.env" | grep -v '#' | xargs)
    fi
fi

if [ -z "$NOTION_TOKEN" ]; then
    echo "❌ NOTION_TOKEN not found!"
    echo ""
    echo "Setup steps:"
    echo "1. Go to https://www.notion.so/my-integrations"
    echo "2. Create new integration"
    echo "3. Copy the token (starts with 'secret_')"
    echo "4. Add to ~/.openclaw/.env:"
    echo "   NOTION_TOKEN=secret_your_token_here"
    echo ""
    exit 1
fi

echo "✅ NOTION_TOKEN found"
echo ""

# Test connection
echo "🔄 Testing Notion connection..."
if node notion-cli.js test >/dev/null 2>&1; then
    echo "✅ Connected to Notion!"
else
    echo "❌ Connection failed"
    echo "Make sure you've shared at least one page with your integration"
    echo "In Notion: Share → Add connections → Select your integration"
    exit 1
fi

echo ""
echo "📦 Available Templates:"
echo ""
echo "1. Command Center    - Master dashboard (Content, Projects, Orders, Knowledge)"
echo "2. Content Pipeline  - Editorial calendar for creators"
echo "3. Project Tracker   - Manage projects and deadlines"  
echo "4. 3D Print CRM      - Customer and order management"
echo "5. Knowledge Base    - SOPs and documentation"
echo "6. Skip for now      - I'll set up my own"
echo ""

# Add tip about ID column
echo "💡 TIP: Add an 'ID' property (type: unique ID) to auto-number entries."
echo "   Then reference them as #1, #2, #3 instead of long UUIDs!"
echo ""

read -p "Which template do you want to set up? (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🗂️  Command Center Template (Recommended)"
        echo "=========================================="
        echo ""
        echo "A unified dashboard for everything."
        echo ""
        echo "Steps to create:"
        echo "1. In Notion, create a new database"
        echo "2. Add these properties:"
        echo "   - Name (title)"
        echo "   - ID (unique_id) ← Auto-numbers: #1, #2, #3..."
        echo "   - Categories (select): Content, Project, Order, Knowledge, Idea, Other, Business"
        echo "   - Type (multi_select): Research, Question, SOP, Feature, Print, Video, Post"
        echo "   - Platform (multi_select): X/Twitter, YouTube, MakerWorld, Rumble, Blog"
        echo "   - Tags (multi_select): 3D Printing, AI, Business"
        echo "   - Status (status): Not started, In progress, Done"
        echo "   - Priority (select): Critical, High, Medium, Low"
        echo "   - Publish Date (date)"
        echo "   - Notes (rich_text)"
        echo ""
        echo "3. Add views: Board (by Status), Calendar (by Publish Date)"
        echo "4. Share with your integration"
        echo "5. Copy database ID from URL:"
        echo "   https://www.notion.so/workspace/ABC123..."
        echo "                        ^^^^^^^^
                        Use this ID"
        echo ""
        echo "Pro Tip: The 'ID' column lets you say 'ID#3' instead of copy-pasting UUIDs!"
        echo ""
        echo "Example usage after setup:"
        echo '  node notion-cli.js append-body "#3" --database DB_ID --text "Research" --type h2'
        ;;

    2)
        echo ""
        echo "📝 Content Pipeline Template"
        echo "==========================="
        echo ""
        echo "Steps to create:"
        echo "1. In Notion, create a new database"
        echo "2. Add these properties:"
        echo "   - Title (title)"
        echo "   - ID (unique_id) ← Enable auto-numbering!"
        echo "   - Status (select): Idea, Drafting, Review, Scheduled, Posted"
        echo "   - Platform (multi_select): X/Twitter, YouTube, Blog, etc."
        echo "   - Publish Date (date)"
        echo "   - Tags (multi_select)"
        echo ""
        echo "3. Share with your integration"
        echo "4. Copy the database ID from the URL"
        echo "5. Add to ~/.openclaw/.env:"
        echo "   CONTENT_DB_ID=your_database_id"
        echo ""
        echo "💡 With ID column: Reference entries as #1, #2, #3 instead of UUIDs"
        ;;
    
    3)
        echo ""
        echo "🎯 Project Tracker Template"
        echo "=========================="
        echo ""
        echo "Steps to create:"
        echo "1. In Notion, create a new database"
        echo "2. Add these properties:"
        echo "   - Name (title)"
        echo "   - ID (unique_id) ← For easy referencing (#3, #7, etc.)"
        echo "   - Status (status): Not Started, In Progress, Blocked, Done"
        echo "   - Priority (select): Critical, High, Medium, Low"
        echo "   - Due Date (date)"
        echo "   - Est. Hours (number)"
        echo ""
        echo "3. Share with your integration"
        echo "4. Copy the database ID from the URL"
        echo "5. Add to ~/.openclaw/.env:"
        echo "   PROJECT_DB_ID=your_database_id"
        echo ""
        echo "Tip: Say 'Update ID#5' instead of 'Update 2fb3e4ac-d0a7-8175-ab53-ffbea739796d'"
        ;;
    
    4)
        echo ""
        echo "🖨️ 3D Print CRM Template"
        echo "======================="
        echo ""
        echo "Steps to create:"
        echo "1. In Notion, create a new database"
        echo "2. Add these properties:"
        echo "   - Customer Name (title)"
        echo "   - ID (unique_id) ← Order numbers: #001, #002..."
        echo "   - Status (status): Lead, Quote, Ordered, Printing, Shipped"
        echo "   - Email (email)"
        echo "   - Order Value (number)"
        echo "   - Filament Type (multi_select)"
        echo "   - Due Date (date)"
        echo ""
        echo "3. Share with your integration"
        echo "4. Copy the database ID from the URL"
        echo "5. Add to ~/.openclaw/.env:"
        echo "   CRM_DB_ID=your_database_id"
        ;;
    
    5)
        echo ""
        echo "📚 Knowledge Base Template"
        echo "========================="
        echo ""
        echo "Steps to create:"
        echo "1. In Notion, create a new database"
        echo "2. Add these properties:"
        echo "   - Title (title)"
        echo "   - ID (unique_id) ← Article numbers"
        echo "   - Category (select): SOP, Troubleshooting, Design Pattern"
        echo "   - Status (status): Draft, Published, Outdated"
        echo "   - Tags (multi_select)"
        echo "   - Last Verified (date)"
        echo ""
        echo "3. Share with your integration"
        echo "4. Copy the database ID from the URL"
        echo "5. Add to ~/.openclaw/.env:"
        echo "   KB_DB_ID=your_database_id"
        ;;
    
    6)
        echo ""
        echo "📝 Creating your own database:"
        echo ""
        echo "1. Create a database in Notion"
        echo "2. Add ID property (unique_id) for easy referencing!"
        echo "3. Share with your integration (Share → Add connections)"
        echo "4. Get database ID from URL"
        echo "5. View schema: node notion-cli.js get-database YOUR_DB_ID"
        ;;
    
    *)
        echo "Invalid choice. Run again and select 1-6."
        exit 1
        ;;
esac

echo ""
echo "✨ Next Steps:"
echo ""
echo "1. Finish setting up your Notion database"
echo "2. Share it with your integration (Share → Add connections)"
echo "3. Add the database ID to ~/.openclaw/.env"
echo "4. Start using with OpenClaw!"
echo ""
echo "🆔 ID Reference Guide:"
echo "   Notion ID:  Use '#3'  (human-friendly, what you see)"
echo "   Direct UUID: Use '2fb3e4ac...'  (for automation)"
echo ""
echo "Example commands:"
echo '  node notion-cli.js query-database $DB_ID --numbered'
echo '  node notion-cli.js get-page "#3" $DB_ID'
echo '  node notion-cli.js append-body "#3" --database $DB_ID --text "content" --type h2'
echo ""
echo "For full docs: cat SKILL.md | less"
echo "For support: ./SUPPORT.md"
echo ""
