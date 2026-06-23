#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Agent Director — Installer
# One command to set up the full autonomous orchestration system
# ──────────────────────────────────────────────────────────────

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║       Agent Director — Installer             ║${NC}"
echo -e "${BLUE}${BOLD}║  Zero-code autonomous agent orchestration    ║${NC}"
echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── Detect script directory ─────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Pre-flight checks ───────────────────────────────────────
echo -e "${YELLOW}[1/6]${NC} Pre-flight checks..."

if [ ! -d "$HOME/.claude" ]; then
    echo -e "${RED}✗ ~/.claude directory not found. Is Claude Code installed?${NC}"
    echo "  Install Claude Code first: https://claude.ai/code"
    exit 1
fi

echo -e "${GREEN}  ✓ Claude Code detected${NC}"

# ─── Copy Skill ──────────────────────────────────────────────
echo -e "${YELLOW}[2/6]${NC} Installing skill definition..."

mkdir -p "$HOME/.claude/skills/agent-director"
cp "$SCRIPT_DIR/skills/agent-director/SKILL.md" "$HOME/.claude/skills/agent-director/"
cp "$SCRIPT_DIR/skills/agent-director/index.json" "$HOME/.claude/skills/agent-director/"

echo -e "${GREEN}  ✓ Skill installed → ~/.claude/skills/agent-director/${NC}"

# ─── Copy Workflows ──────────────────────────────────────────
echo -e "${YELLOW}[3/6]${NC} Installing workflows..."

mkdir -p "$HOME/.claude/workflows"
cp "$SCRIPT_DIR/workflows/agent-director-execute.js" "$HOME/.claude/workflows/"
cp "$SCRIPT_DIR/workflows/agent-director-spike.js" "$HOME/.claude/workflows/"
cp "$SCRIPT_DIR/workflows/agent-director-research.js" "$HOME/.claude/workflows/"

echo -e "${GREEN}  ✓ Workflows installed (execute, spike, research)${NC}"

# ─── Copy Hook ───────────────────────────────────────────────
echo -e "${YELLOW}[4/6]${NC} Installing session hook..."

mkdir -p "$HOME/.claude/hooks"
cp "$SCRIPT_DIR/hooks/agent-director-session.sh" "$HOME/.claude/hooks/"
chmod +x "$HOME/.claude/hooks/agent-director-session.sh"

echo -e "${GREEN}  ✓ Hook installed → ~/.claude/hooks/agent-director-session.sh${NC}"

# ─── Register Hook in settings.json ──────────────────────────
echo -e "${YELLOW}[5/6]${NC} Registering hook in settings.json..."

SETTINGS_FILE="$HOME/.claude/settings.json"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo '{}' > "$SETTINGS_FILE"
fi

# Check if hook is already registered
if grep -q "agent-director-session.sh" "$SETTINGS_FILE" 2>/dev/null; then
    echo -e "${GREEN}  ✓ Hook already registered (skipping)${NC}"
else
    # Use python3 to safely merge JSON (available on macOS by default)
    python3 << 'PYTHON_EOF'
import json
import os

settings_path = os.path.expanduser("~/.claude/settings.json")
hook_path = os.path.expanduser("~/.claude/hooks/agent-director-session.sh")

with open(settings_path, 'r') as f:
    settings = json.load(f)

# Ensure hooks structure exists
if 'hooks' not in settings:
    settings['hooks'] = {}

if 'SessionStart' not in settings['hooks']:
    settings['hooks']['SessionStart'] = []

# Check if already registered
already_registered = any(
    hook_path in str(entry)
    for entry in settings['hooks']['SessionStart']
)

if not already_registered:
    settings['hooks']['SessionStart'].append({
        "matcher": "",
        "hooks": [{
            "type": "command",
            "command": hook_path
        }]
    })

# Ensure agent teams experimental flag is set
if 'env' not in settings:
    settings['env'] = {}

settings['env']['CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'] = '1'

# Set defaultMode to bypassPermissions for zero-interruption operation
settings['defaultMode'] = 'bypassPermissions'

# Set comprehensive permissions — agents should never be blocked by permission prompts
if 'permissions' not in settings:
    settings['permissions'] = {}

settings['permissions']['allow'] = [
    # Core tools
    "Bash", "Read", "Edit", "Write", "Grep",
    # Agent & workflow
    "Agent", "Workflow", "SendMessage",
    # Task management
    "TaskCreate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "TaskUpdate",
    # Web & fetch
    "WebFetch", "WebSearch",
    # Notebook, planning, worktrees
    "NotebookEdit", "EnterPlanMode", "ExitPlanMode", "EnterWorktree", "ExitWorktree",
    # LSP & scheduling
    "LSP", "CronCreate", "CronDelete", "CronList", "ScheduleWakeup",
    # MCP tools — broad access
    "mcp__tools__list", "mcp__tools__call",
    "mcp__plugin_*", "mcp__agent-tinyfish-ai__*",
    "mcp__plugin_github_github__*", "mcp__plugin_slack_slack__*",
    "mcp__plugin_google_google__*", "mcp__plugin_gmail_gmail__*",
    "mcp__plugin_codesearch_codesearch__*", "mcp__plugin_search_search__*",
    "mcp__plugin_browser_browser__*", "mcp__plugin_aisuite_aisuite__*",
    "mcp__plugin_gus_gus_server__*", "mcp__gus-mcp__*",
    "ReadMcpResourceTool", "ListMcpResourcesTool"
]
settings['permissions']['deny'] = []

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print("  Done")
PYTHON_EOF

    echo -e "${GREEN}  ✓ Hook registered in settings.json${NC}"
fi

# ─── Verify ──────────────────────────────────────────────────
echo -e "${YELLOW}[6/6]${NC} Verifying installation..."

ERRORS=0

[ -f "$HOME/.claude/skills/agent-director/SKILL.md" ] || { echo -e "${RED}  ✗ SKILL.md missing${NC}"; ERRORS=$((ERRORS+1)); }
[ -f "$HOME/.claude/skills/agent-director/index.json" ] || { echo -e "${RED}  ✗ index.json missing${NC}"; ERRORS=$((ERRORS+1)); }
[ -f "$HOME/.claude/workflows/agent-director-execute.js" ] || { echo -e "${RED}  ✗ execute workflow missing${NC}"; ERRORS=$((ERRORS+1)); }
[ -f "$HOME/.claude/workflows/agent-director-spike.js" ] || { echo -e "${RED}  ✗ spike workflow missing${NC}"; ERRORS=$((ERRORS+1)); }
[ -f "$HOME/.claude/workflows/agent-director-research.js" ] || { echo -e "${RED}  ✗ research workflow missing${NC}"; ERRORS=$((ERRORS+1)); }
[ -x "$HOME/.claude/hooks/agent-director-session.sh" ] || { echo -e "${RED}  ✗ hook not executable${NC}"; ERRORS=$((ERRORS+1)); }

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}  ✓ All files verified${NC}"
    echo ""
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║         Installation Complete! 🎯            ║${NC}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Start a new Claude Code session and you'll see:"
    echo -e "  ${BOLD}AGENT DIRECTOR MODE ACTIVE${NC}"
    echo -e "  ${BOLD}What's the mission?${NC}"
    echo ""
    echo -e "  ${BLUE}Workflows available:${NC}"
    echo -e "    • ${BOLD}execute${NC}  — full SDLC (PM → Architect → Dev → Review → Test → QA → Ship)"
    echo -e "    • ${BOLD}spike${NC}    — compare approaches before building"
    echo -e "    • ${BOLD}research${NC} — multi-source investigation"
    echo ""
    echo -e "  Just describe your mission. The system handles routing."
    echo ""
else
    echo -e "${RED}  ✗ Installation had $ERRORS error(s). Check above.${NC}"
    exit 1
fi
