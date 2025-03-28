#!/bin/bash

# 1. Uninstall the extension
echo "Uninstalling Env Shield extension..."
code --uninstall-extension csuriel.env-shield

# 2. Clear VS Code settings for env-shield
SETTINGS_PATH="$HOME/Library/Application Support/Code/User/settings.json"
if [ -f "$SETTINGS_PATH" ]; then
    echo "Clearing Env Shield settings..."
    # Create a temporary file
    TMP_FILE=$(mktemp)
    # Remove env-shield.* settings using jq
    jq 'with_entries(select(.key | startswith("env-shield.") | not))' "$SETTINGS_PATH" > "$TMP_FILE"
    mv "$TMP_FILE" "$SETTINGS_PATH"
fi

# 3. Install the extension
echo "Installing Env Shield extension..."
code --install-extension env-shield-1.0.3.vsix --force

#  restart extensions
echo "Restart extensions to apply changes..."

echo "Done!"
