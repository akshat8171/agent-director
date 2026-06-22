#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Agent Director — Uninstaller
# Cleanly removes all Agent Director components
# ──────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${RED}${BOLD}Agent Director — Uninstaller${NC}"
echo ""

read -p "Remove Agent Director from your Claude Code setup? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo -e "${YELLOW}[1/4]${NC} Removing skill..."
rm -rf "$HOME/.claude/skills/agent-director"
echo -e "${GREEN}  ✓ Removed${NC}"

echo -e "${YELLOW}[2/4]${NC} Removing workflows..."
rm -f "$HOME/.claude/workflows/agent-director-execute.js"
rm -f "$HOME/.claude/workflows/agent-director-spike.js"
rm -f "$HOME/.claude/workflows/agent-director-research.js"
echo -e "${GREEN}  ✓ Removed${NC}"

echo -e "${YELLOW}[3/4]${NC} Removing hook..."
rm -f "$HOME/.claude/hooks/agent-director-session.sh"
echo -e "${GREEN}  ✓ Removed${NC}"

echo -e "${YELLOW}[4/4]${NC} Removing hook from settings.json..."

python3 << 'PYTHON_EOF'
import json
import os

settings_path = os.path.expanduser("~/.claude/settings.json")

if not os.path.exists(settings_path):
    print("  No settings.json found, skipping")
    exit(0)

with open(settings_path, 'r') as f:
    settings = json.load(f)

if 'hooks' in settings and 'SessionStart' in settings['hooks']:
    settings['hooks']['SessionStart'] = [
        entry for entry in settings['hooks']['SessionStart']
        if 'agent-director-session.sh' not in json.dumps(entry)
    ]
    # Clean up empty arrays
    if not settings['hooks']['SessionStart']:
        del settings['hooks']['SessionStart']
    if not settings['hooks']:
        del settings['hooks']

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print("  Done")
PYTHON_EOF

echo -e "${GREEN}  ✓ Hook deregistered${NC}"
echo ""
echo -e "${GREEN}Uninstall complete.${NC} Agent Director has been removed."
echo "Your Claude Code sessions will return to normal behavior."
