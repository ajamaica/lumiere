#!/bin/bash
# Manage Jami contacts
# Usage: ./jami_contacts.sh <action> [args]

ACTION="${1:-list}"
ACCOUNT_ID="${JAMI_ACCOUNT_ID:-}"
CONTACTS_FILE="$HOME/.jami_contacts.txt"

# Get default account if not set
if [ -z "$ACCOUNT_ID" ]; then
    ACCOUNT_ID=$(jami account list 2>/dev/null | head -1)
fi

case "$ACTION" in
    list)
        echo "📋 Jami Contacts:"
        echo ""
        if [ -f "$CONTACTS_FILE" ]; then
            cat "$CONTACTS_FILE" | while read line; do
                [ -z "$line" ] && continue
                NAME=$(echo "$line" | cut -d'=' -f1)
                ID=$(echo "$line" | cut -d'=' -f2)
                echo "  $NAME: $ID"
            done
        else
            echo "  No saved contacts. Add with: $0 add <name> <jami_id>"
        fi
        ;;
    
    add)
        NAME="$2"
        ID="$3"
        
        if [ -z "$NAME" ] || [ -z "$ID" ]; then
            echo "Usage: $0 add <name> <jami_id>"
            exit 1
        fi
        
        echo "$NAME=$ID" >> "$CONTACTS_FILE"
        echo "✅ Added contact: $NAME ($ID)"
        ;;
    
    remove)
        NAME="$2"
        if [ -z "$NAME" ]; then
            echo "Usage: $0 remove <name>"
            exit 1
        fi
        
        grep -v "^$NAME=" "$CONTACTS_FILE" > "$CONTACTS_FILE.tmp"
        mv "$CONTACTS_FILE.tmp" "$CONTACTS_FILE"
        echo "✅ Removed contact: $NAME"
        ;;
    
    get)
        NAME="$2"
        if [ -z "$NAME" ]; then
            echo "Usage: $0 get <name>"
            exit 1
        fi
        
        grep "^$NAME=" "$CONTACTS_FILE" | cut -d'=' -f2
        ;;
    
    call)
        NAME="$2"
        if [ -z "$NAME" ]; then
            echo "Usage: $0 call <contact_name>"
            exit 1
        fi
        
        ID=$(grep "^$NAME=" "$CONTACTS_FILE" | cut -d'=' -f2)
        if [ -z "$ID" ]; then
            echo "❌ Contact not found: $NAME"
            exit 1
        fi
        
        echo "📞 Calling $NAME..."
        jami call "$ACCOUNT_ID" "$ID"
        ;;
    
    *)
        echo "Usage: $0 <action> [args]"
        echo ""
        echo "Actions:"
        echo "  list              - List all contacts"
        echo "  add <name> <id>   - Add new contact"
        echo "  remove <name>     - Remove contact"
        echo "  get <name>        - Get contact ID"
        echo "  call <name>       - Call contact by name"
        exit 1
        ;;
esac
