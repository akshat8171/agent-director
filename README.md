# Agent Director 🎯

> Zero-code, fully autonomous multi-agent orchestration for Claude Code. You operate as an Engineering Director — provide intent, agents handle everything.

## What Is This?

Agent Director transforms Claude Code into a **full engineering team** that runs your SDLC end-to-end:

```
You (Director)
  └── "Build a CLI that scrapes Slack and creates weekly digests"
        │
        ├── Product Manager    → requirements + user stories + acceptance criteria
        ├── Tech Lead          → architecture + interfaces + build order
        ├── Developers (N)     → parallel TDD implementation
        ├── Senior Reviewer    → code review + quality gate
        ├── Test Engineer      → comprehensive test suites + bug reports
        ├── QA Manager         → acceptance validation + ship/no-ship
        └── DevOps Manager     → PR + CI + release
```

**You never write code. You never debug. You never execute.**

You provide the mission brief. Agents make decisions and report outcomes.

---

## Quick Install (30 seconds)

```bash
# Clone and run the installer
git clone https://github.com/AkshatGarg-bot/agent-director.git
cd agent-director
./install.sh
```

That's it. Next time you start a Claude Code session, you'll see:

```
AGENT DIRECTOR MODE ACTIVE
What's the mission?
```

---

## Manual Install

If you prefer to do it yourself:

```bash
# 1. Copy skill
mkdir -p ~/.claude/skills/agent-director
cp skills/agent-director/SKILL.md ~/.claude/skills/agent-director/
cp skills/agent-director/index.json ~/.claude/skills/agent-director/

# 2. Copy workflows
mkdir -p ~/.claude/workflows
cp workflows/agent-director-execute.js ~/.claude/workflows/
cp workflows/agent-director-spike.js ~/.claude/workflows/
cp workflows/agent-director-research.js ~/.claude/workflows/

# 3. Copy and register hook
mkdir -p ~/.claude/hooks
cp hooks/agent-director-session.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/agent-director-session.sh

# 4. Register the hook in settings (manual step)
# Add to ~/.claude/settings.json under "hooks":
# See install.sh for the exact JSON to add
```

---

## How To Use

### Provide a Mission Brief

Just tell it what you want:

```
"Build a REST API for user authentication with JWT tokens"
"Fix the memory leak in the websocket handler"
"Should we use Redis or DynamoDB for session storage?"
"Research how competing products handle rate limiting"
```

### The System Routes Automatically

| You Say | Workflow | Team |
|---------|----------|------|
| "Build X" / "Add Y" | `execute` | PM → Architect → Dev → Review → Test → QA → Ship |
| "Fix this bug" | `execute` (fix mode) | PM → Dev → Review → Test → QA → Ship |
| "Should we use X or Y?" | `spike` | PM → Devs (parallel POCs) → Review → EM Recommendation |
| "Research X" / "Find out about Y" | `research` | Scope → Gather → Verify → Synthesize |
| "Plan the architecture for X" | `spike` | PM → Devs (explore) → Evaluate → Recommend |

### What You Get Back

A **Director's Brief** with:
- Mission status (shipped / conditional / blocked)
- What was delivered (PR links, file paths)
- Decisions made autonomously
- Quality metrics (test results, review scores)
- Open items needing your attention

---

## Three Workflows

### 1. Execute (`agent-director-execute`)

Full SDLC pipeline with 7 roles:

```
PM → Architect → Developers (parallel) → Reviewer → Tester → QA → DevOps
```

**Auto-heal loops:**
- Reviewer requests changes → Dev auto-fixes
- Tester finds blocker bugs → Dev auto-fixes
- QA fails → Ship is blocked, reports to you

### 2. Spike (`agent-director-spike`)

Technical feasibility exploration:

```
PM (scope) → Developers (parallel POCs) → Reviewer+QA (evaluate) → EM (recommend)
```

Use when you need to compare approaches before committing to a full build.

**Args:**
```json
{
  "question": "Should we use GraphQL or REST for the new API?",
  "approaches": ["GraphQL with Apollo", "REST with OpenAPI", "tRPC"],
  "constraints": ["Must support mobile clients", "Team knows REST well"]
}
```

### 3. Research (`agent-director-research`)

Multi-source investigation with adversarial verification:

```
Scope → Gather (parallel researchers) → Verify (skeptics) → Synthesize
```

**Args:**
```json
{
  "question": "How do competitors handle rate limiting at scale?",
  "sources": ["codebase", "slack", "docs", "web"],
  "depth": "thorough"
}
```

---

## Configuration

### Customize for Your Profile

Edit `~/.claude/skills/agent-director/index.json`:

```json
{
  "proficiency": {
    "current_pl": "PL3",
    "current_stage": 7,
    "stage_name": "Manager of Agent Managers"
  }
}
```

### Adjust Escalation Policy

By default, the system:
- Auto-retries up to 2 times on failure
- Auto-fixes code review issues
- Auto-fixes blocker bugs from testing
- Only escalates to you for: ambiguous requirements, external deps, risk decisions

Change in `index.json`:
```json
{
  "escalation_policy": {
    "max_retries": 2,
    "auto_fix_on": ["review_changes_requested", "test_bugs_found"],
    "block_ship_on": ["qa_fail", "security_critical"],
    "escalate_to_director_on": ["ambiguous_requirements", "external_dependency", "risk_decision"]
  }
}
```

### Customize Session Hook

Edit `~/.claude/hooks/agent-director-session.sh` to change the greeting or behavior:

```bash
# Change the additionalContext to customize agent behavior
```

---

## Requirements

- **Claude Code** (CLI) with Workflow support
- **Claude Code Experimental Agent Teams** enabled:
  ```json
  // In ~/.claude/settings.json → env
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  ```

---

## Uninstall

```bash
cd agent-director
./uninstall.sh
```

Or manually:
```bash
rm -rf ~/.claude/skills/agent-director
rm ~/.claude/workflows/agent-director-execute.js
rm ~/.claude/workflows/agent-director-spike.js
rm ~/.claude/workflows/agent-director-research.js
rm ~/.claude/hooks/agent-director-session.sh
# Then remove the hook entry from ~/.claude/settings.json
```

---

## FAQ

**Q: Do I need all the MCP plugins?**
A: No. The workflows work with whatever tools are available. More plugins = richer research + code search.

**Q: Can I use just one workflow?**
A: Yes. You can manually invoke any workflow. The session hook just enables auto-routing.

**Q: Will this mess up my existing Claude Code setup?**
A: No. It only adds files — doesn't modify existing ones except adding a hook entry to settings.json. The uninstall script cleanly removes everything.

**Q: What if I want to code sometimes?**
A: Just tell the session "I'm coding directly today" and it'll switch to normal mode.

---

## License

MIT — use however you want, credit appreciated.

## Author

Built by **Akshat Garg** (akshat.garg@salesforce.com)
PL3 Stage 7 — Manager of Agent Managers, 93rd percentile
