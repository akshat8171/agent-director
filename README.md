# Agent Director

> Autonomous multi-agent orchestration for Claude Code. Operate as an Engineering Director — provide intent, agents deliver outcomes.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://git.soma.salesforce.com/akshat-garg/agent-director)
[![Claude Code](https://img.shields.io/badge/platform-Claude%20Code-purple.svg)](https://claude.ai/code)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Overview

Agent Director transforms Claude Code from a single coding assistant into a **full autonomous engineering team**. Instead of prompting, reviewing, and iterating manually, you provide a mission brief and receive finished work — commits, PRs, test results, and quality reports.

```
You (Director)
  └── "Build a CLI that scrapes Slack and creates weekly digests"
        │
        ├── Product Manager    → requirements + user stories + acceptance criteria
        ├── Tech Lead          → architecture + interfaces + build order
        ├── Developers (N)     → parallel TDD implementation in isolated worktrees
        ├── Senior Reviewer    → code review across 6 quality dimensions
        ├── Test Engineer      → unit / integration / edge / regression / perf tests
        ├── QA Manager         → acceptance validation + ship/no-ship decision
        └── DevOps Manager     → PR creation + CI validation + release packaging
```

**You never write code. You never debug. You never execute.**

You provide the mission brief. Agents make decisions and report outcomes.

---

## Table of Contents

- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Workflows](#workflows)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [FAQ](#faq)
- [Uninstall](#uninstall)

---

## Quick Start

### Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed (`~/.claude/` directory exists)
- macOS or Linux (uses `bash` + `python3`)

### Install (30 seconds)

```bash
git clone https://git.soma.salesforce.com/akshat-garg/agent-director.git
cd agent-director
./install.sh
```

The installer:
1. Copies skill definitions to `~/.claude/skills/agent-director/`
2. Installs 3 workflow scripts to `~/.claude/workflows/`
3. Registers a SessionStart hook in `~/.claude/settings.json`
4. Enables the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` flag
5. Verifies all files are correctly placed

Next time you start a Claude Code session:

```
AGENT DIRECTOR MODE ACTIVE
What's the mission?
```

### Manual Install

<details>
<summary>Click to expand manual steps</summary>

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

# 4. Register hook in settings.json (see install.sh for exact JSON)
# 5. Add to env: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
```

</details>

---

## How It Works

### Operating Model

Agent Director implements a **Director → Router → Team** hierarchy:

```
┌─────────────────────────────────────────────────────────────────┐
│  DIRECTOR (You)                                                  │
│  Provides: intent, constraints, go/no-go                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  SESSION ROUTER (Skill + Hook)                                   │
│  Classifies usecase → selects workflow → dispatches execution    │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │   EXECUTE   │   │    SPIKE    │   │  RESEARCH   │
   │  Full SDLC  │   │  Feasibility│   │  Multi-src  │
   │  7 roles    │   │  N approaches│  │  Verify+Synth│
   └─────────────┘   └─────────────┘   └─────────────┘
```

### Session Flow

1. **SessionStart hook fires** → injects Director-mode context
2. **You describe your mission** → "Build X" / "Fix Y" / "Research Z"
3. **Router classifies** → `build` | `fix` | `research` | `ship` | `plan` | `operate`
4. **Router presents plan** → which agents, what sequence, what they'll deliver
5. **You give go/no-go** → single approval
6. **Agents execute autonomously** → parallel where possible, quality-gated
7. **Director's Brief delivered** → status, deliverables, metrics, open items

### Routing Table

| You Say | Classification | Workflow | Team Composition |
|---------|---------------|----------|-----------------|
| "Build X" / "Add Y" | `build` | Execute | PM → Architect → Dev(N) → Review → Test → QA → Ship |
| "Fix this bug" / "Fix the crash" | `fix` | Execute | PM → Dev → Review → Test → QA → Ship |
| "Ship it" / "Create PR" | `ship` | Execute | DevOps-focused execution |
| "Should we use X or Y?" | `spike` | Spike | PM → Dev(N parallel) → Evaluate → Recommend |
| "Plan the architecture for X" | `plan` | Spike | PM → Dev(explore) → Evaluate → Recommend |
| "Research X" / "Find out about Y" | `research` | Research | Scope → Gather(N) → Verify → Synthesize |
| "Set up monitoring for X" | `operate` | Execute | Ops-focused execution |

### Self-Healing & Quality Gates

The system has built-in recovery loops:

```
Developer output
       │
       ▼
  ┌─────────┐    changes_requested    ┌────────────┐
  │ Reviewer │ ─────────────────────► │ Dev (fix)  │ ──┐
  └─────────┘                         └────────────┘   │
       │ approved                                       │
       ▼                                                │
  ┌─────────┐    blocker bugs found   ┌────────────┐   │
  │ Tester  │ ─────────────────────► │ Dev (fix)  │   │
  └─────────┘                         └────────────┘   │
       │ passing                                        │
       ▼                                  max 2 retries │
  ┌─────────┐                                          │
  │   QA    │ ◄────────────────────────────────────────┘
  └─────────┘
       │ pass / conditional_pass
       ▼
  ┌─────────┐
  │ DevOps  │ → PR + CI + Release
  └─────────┘
```

**Escalation Policy** — only escalates to you for:
- Ambiguous requirements (multiple valid interpretations)
- External dependencies (access, permissions, approvals needed)
- Risk decisions (destructive operations, public-facing changes)

---

## Workflows

### 1. Execute — Full SDLC Pipeline

**When:** Building features, fixing bugs, shipping code

**Phases:** PM → Architect → Develop → Review → Test → Ship

| Phase | Agent Role | Delivers | Method |
|-------|-----------|----------|--------|
| PM | Product Manager | Product brief, user stories (MoSCoW), acceptance criteria, success metrics | Prioritization + scope control |
| Architect | Tech Lead | Architecture pattern, components, data models, build order, API contracts | Codebase analysis + design |
| Develop | Developers (N parallel) | Working code + passing tests per component | TDD in isolated worktrees |
| Review | Senior Reviewer | Verdict + issues (6 dimensions: bugs, security, perf, design, maintainability, tests) | Structured code review |
| Test | Test Engineer | Test suites (unit/integration/edge/regression/perf) + bug reports | Comprehensive coverage |
| Ship | QA Manager + DevOps | Acceptance validation → PR creation → CI readiness | Quality gate + release |

**Structured output from every role** — 7 JSON schemas enforce consistent inter-agent communication.

**Args:**
```json
{
  "usecase": "Build a REST API for user authentication with JWT tokens",
  "type": "build",
  "priority": "high",
  "constraints": ["Must use existing database schema", "Support OAuth2 flow"]
}
```

---

### 2. Spike — Technical Feasibility Exploration

**When:** Comparing approaches, evaluating feasibility before committing to a full build

**Phases:** Scope → Explore → Evaluate → Recommend

| Phase | Agent Role | Delivers |
|-------|-----------|----------|
| Scope | Product Manager | Spike objective, success criteria, approaches to explore, hypotheses |
| Explore | Developers (N parallel) | POC per approach: feasibility verdict, complexity, effort estimate, pros/cons |
| Evaluate | Reviewer + QA | Adversarial assessment: testability, maintainability, scalability scores |
| Recommend | Engineering Manager | Go/no-go recommendation with rationale + implementation path |

Each developer runs in an **isolated worktree** — POCs don't interfere with each other.

**Args:**
```json
{
  "question": "Should we use GraphQL or REST for the new API?",
  "approaches": ["GraphQL with Apollo", "REST with OpenAPI", "tRPC"],
  "constraints": ["Must support mobile clients", "Team knows REST well"],
  "max_approaches": 3
}
```

**Output:**
```json
{
  "recommended_approach": "REST with OpenAPI",
  "confidence": "high",
  "rationale": "Team expertise + mobile client simplicity outweighs GraphQL flexibility",
  "implementation_path": ["Define OpenAPI spec", "Generate types", "Implement endpoints", "Add auth middleware"],
  "spike_answered": true
}
```

---

### 3. Research — Multi-Source Investigation

**When:** Pure research — no code changes, just answers

**Phases:** Scope → Gather → Verify → Synthesize

| Phase | Agent Role | Delivers |
|-------|-----------|----------|
| Scope | Research Director | Sub-questions, search strategies per source, expected answer shape |
| Gather | Specialists (N parallel) | Findings with evidence, confidence levels, gaps identified |
| Verify | Skeptical Verifiers | Adversarial claim validation — confirmed vs refuted |
| Synthesize | Synthesizer | Executive summary + key findings + open questions + next steps |

**Sources searched:** codebase, Slack, internal docs, web (configurable)

**Depth levels:**
- `quick` — 3 claims verified
- `thorough` (default) — 5 claims verified
- `exhaustive` — 10 claims verified

**Args:**
```json
{
  "question": "How do competitors handle rate limiting at scale?",
  "sources": ["codebase", "slack", "docs", "web"],
  "depth": "thorough"
}
```

---

## Architecture

### File Structure

```
agent-director/
├── skills/
│   └── agent-director/
│       ├── SKILL.md              # Orchestration instructions + role definitions
│       └── index.json            # Configuration, routing, escalation policy
├── workflows/
│   ├── agent-director-execute.js # Full SDLC pipeline (547 lines, 7 schemas, 8 agents)
│   ├── agent-director-spike.js   # Spike workflow (232 lines, 4 schemas, 4+ agents)
│   └── agent-director-research.js# Research workflow (159 lines, 3 schemas, 5+ agents)
├── hooks/
│   └── agent-director-session.sh # SessionStart hook (injects Director-mode context)
├── install.sh                    # One-command installer with verification
├── uninstall.sh                  # Clean removal script
├── .gitignore
└── README.md
```

### How Components Connect

```
┌─────────────────────────────────────────────────────────────┐
│  ~/.claude/settings.json                                     │
│    hooks.SessionStart → agent-director-session.sh            │
│    env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"            │
└────────────────────────────┬────────────────────────────────┘
                             │ fires on session start
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ~/.claude/hooks/agent-director-session.sh                    │
│    Outputs JSON → injects additionalContext into session      │
│    "AGENT DIRECTOR MODE ACTIVE..."                           │
└────────────────────────────┬────────────────────────────────┘
                             │ activates skill
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ~/.claude/skills/agent-director/                             │
│    SKILL.md → defines roles, protocol, output format         │
│    index.json → routing map, escalation rules, team config   │
└────────────────────────────┬────────────────────────────────┘
                             │ dispatches to
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ~/.claude/workflows/agent-director-*.js                      │
│    Workflow scripts → spawn agents, enforce schemas,          │
│    orchestrate phases, return structured results              │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Structured over prose** | 14 JSON schemas across workflows — agents communicate via validated data, not free text |
| **Parallel where possible** | Developers build components simultaneously in isolated worktrees |
| **Quality-gated** | Code must pass review + testing + QA before shipping — no shortcuts |
| **Self-healing** | Auto-fix loops for review issues and blocker bugs (max 2 retries) |
| **Minimal escalation** | Only 3 conditions escalate to the human: ambiguity, external deps, risk |
| **Zero-config activation** | SessionStart hook activates automatically — no manual invocation needed |

---

## Configuration

### Proficiency Profile

Edit `~/.claude/skills/agent-director/index.json` to match your level:

```json
{
  "proficiency": {
    "current_pl": "PL3",
    "current_stage": 7,
    "stage_name": "Manager of Agent Managers",
    "percentile": 0.93,
    "target_stage": 9,
    "target_name": "Trusted Automation & Autonomy"
  }
}
```

### Escalation Policy

Control what the system handles autonomously vs. what it asks you about:

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

### Customize the Session Hook

Edit `~/.claude/hooks/agent-director-session.sh` to change the greeting message or Director-mode protocol.

---

## Usage Examples

### Build a Feature

```
You: "Build a WebSocket notification service with Redis pub/sub"

System: Classified as BUILD → Execute workflow
  PM: 4 user stories, 6 acceptance criteria
  Architect: Event-driven pattern, 3 components, Redis adapter + WS handler + auth middleware
  Dev Team: 3 parallel developers → 12 files created, 28 tests
  Reviewer: Approved (8/10 quality, 2 minor suggestions)
  Tester: 28/28 passing, 0 bugs, 4 edge cases covered
  QA: PASS — all criteria met
  DevOps: PR #42 created, CI green

Director's Brief: SHIPPED — PR #42 ready for merge
```

### Explore Approaches

```
You: "Should we use WebSockets or SSE for real-time notifications?"

System: Classified as SPIKE → Spike workflow
  PM: Defined 4 success criteria, 2 approaches scoped
  Dev 1: WebSocket spike — proven feasibility, moderate complexity
  Dev 2: SSE spike — proven feasibility, trivial complexity
  Reviewer: SSE scores higher on maintainability (8 vs 6)
  EM: Recommends SSE (high confidence) — simpler, sufficient for unidirectional updates

Recommendation: SSE with EventSource API
```

### Research a Question

```
You: "How does our auth service handle token refresh under high concurrency?"

System: Classified as RESEARCH → Research workflow
  Scope: 4 sub-questions across codebase + Slack + docs
  Gather: 8 findings from 3 sources
  Verify: 5/5 key claims confirmed
  Synthesize: Structured report with evidence

Report: Token refresh uses optimistic locking with Redis CAS...
```

---

## FAQ

<details>
<summary><b>Do I need all the MCP plugins?</b></summary>

No. The workflows work with whatever tools are available in your session. More plugins (codesearch, Slack, Google Workspace) = richer research and code search capabilities.
</details>

<details>
<summary><b>Can I use just one workflow?</b></summary>

Yes. You can manually invoke any workflow via the Workflow tool. The session hook enables auto-routing, but each workflow is independently callable.
</details>

<details>
<summary><b>Will this mess up my existing Claude Code setup?</b></summary>

No. The installer only adds files — it doesn't modify existing configurations except appending a hook entry to `settings.json`. The `uninstall.sh` script cleanly removes everything.
</details>

<details>
<summary><b>What if I want to code directly sometimes?</b></summary>

Just tell the session: "I'm coding directly today" — it switches to normal mode. The Director protocol is a behavioral guide, not a hard lock.
</details>

<details>
<summary><b>How many agents does a typical execution spawn?</b></summary>

- **Execute:** 8+ agents (PM, Architect, N developers, Reviewer, fix loops, Tester, QA, DevOps)
- **Spike:** 4-8 agents (PM, N developers exploring approaches, N evaluators, EM)
- **Research:** 5-12 agents (Scoper, N researchers per source, N verifiers, Synthesizer)
</details>

<details>
<summary><b>What happens if an agent fails?</b></summary>

The system retries up to 2 times (configurable). If a developer's output fails review, it auto-fixes. If tests find blockers, they auto-patch. Only persistent failures escalate to you.
</details>

<details>
<summary><b>Can I customize the team roles?</b></summary>

Yes. Edit `SKILL.md` to change role definitions, add new roles, or modify the review criteria. Edit workflow `.js` files to change the pipeline structure or add new phases.
</details>

---

## Uninstall

```bash
cd agent-director
./uninstall.sh
```

<details>
<summary>Manual uninstall</summary>

```bash
rm -rf ~/.claude/skills/agent-director
rm ~/.claude/workflows/agent-director-execute.js
rm ~/.claude/workflows/agent-director-spike.js
rm ~/.claude/workflows/agent-director-research.js
rm ~/.claude/hooks/agent-director-session.sh
# Then remove the hook entry from ~/.claude/settings.json
```

</details>

---

## Requirements

| Requirement | Details |
|-------------|---------|
| Claude Code CLI | With Workflow support enabled |
| Agent Teams flag | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (installer sets this) |
| Python 3 | For installer JSON manipulation (pre-installed on macOS) |
| Bash | For hook execution |

---

## Roadmap

- [ ] Event-driven triggers (Slack message → auto-triage → auto-fix)
- [ ] Scheduled workflows (nightly test runs, dependency audits)
- [ ] Cross-session memory (learn from past executions)
- [ ] Metrics dashboard (agent utilization, quality trends, cycle time)
- [ ] Multi-repo orchestration (coordinate across services)
- [ ] Custom role definitions via configuration (no code changes)

---

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Test installation: `./install.sh` → start new Claude Code session → verify behavior
5. Submit a PR

---

## License

MIT — use however you want, credit appreciated.

---

## Author

Built by **Akshat Garg** (akshat.garg@salesforce.com)

Engineering Manager | PL3 Stage 7 — Manager of Agent Managers (93rd percentile)
