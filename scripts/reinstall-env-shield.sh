#!/bin/bash

# 1. Uninstall the extension
echo "Uninstalling Env Shield extension..."
code --uninstall-extension csuriel.env-shield


# 3. Install the extension
echo "Installing Env Shield extension..."
version=$(jq -r '.version' /Users/csuriel/projects/vscode-blur/package.json)
vsix_file="env-shield-${version}.vsix"

if [[ -f "$vsix_file" ]]; then
    code --install-extension "$vsix_file" --force
else
    echo "VSIX file not found. Please run 'npm run package' to generate the VSIX file."
    exit 1
fi

#  restart extensions
echo "Restart extensions to apply changes..."

echo "Done!"
