#!/bin/bash
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$SKILL_DIR/config/config.toml"
TEMPLATE_FILE="$SKILL_DIR/config/config.template.toml"

echo "=== Teldrive Setup ==="

if [ -f "$CONFIG_FILE" ]; then
    read -p "Config file already exists. Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting."
        exit 1
    fi
fi

cp "$TEMPLATE_FILE" "$CONFIG_FILE"

echo "Enter your Telegram credentials (from my.telegram.org):"
read -p "App ID: " APP_ID
read -p "App Hash: " APP_HASH

echo "Enter Database Connection String (PostgreSQL):"
echo "Example: host=localhost user=postgres password=secret dbname=teldrive port=5432 sslmode=disable"
read -p "DB Source: " DB_SOURCE

read -p "Enter a random string for JWT Secret: " JWT_SECRET

# Update config file
# Using sed for simple replacements. Note: This is fragile if inputs contain special chars.
# Escaping forward slashes in inputs for sed
ESCAPED_DB_SOURCE=$(echo "$DB_SOURCE" | sed 's/\//\\\//g')

sed -i "s/app-id = 0/app-id = $APP_ID/" "$CONFIG_FILE"
sed -i "s/app-hash = \"\"/app-hash = \"$APP_HASH\"/" "$CONFIG_FILE"
sed -i "s/data-source = \"\"/data-source = \"$ESCAPED_DB_SOURCE\"/" "$CONFIG_FILE"
sed -i "s/secret = \"change-me-to-something-random\"/secret = \"$JWT_SECRET\"/" "$CONFIG_FILE"

echo "Config written to $CONFIG_FILE"
echo "Setup complete. Run ./scripts/manage.sh start to launch."
