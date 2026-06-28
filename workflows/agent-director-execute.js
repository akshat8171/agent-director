export const meta = {
  name: 'agent-director-execute',
  description: 'Full SDLC pipeline with real team roles: PM → Architect → Developer → Reviewer → Tester → QA → DevOps',
  whenToUse: 'When the user provides a usecase brief and wants fully autonomous agent-driven execution with zero human-in-loop',
  phases: [
    { title: 'PM', detail: 'Product Manager breaks down requirements, acceptance criteria, and priorities' },
    { title: 'Architect', detail: 'Tech Lead designs solution, defines interfaces, selects patterns' },
    { title: 'Develop', detail: 'Developers implement features with TDD in parallel worktrees' },
    { title: 'Review', detail: 'Senior Reviewer does code review, flags issues, requests changes' },
    { title: 'Test', detail: 'QA Engineer writes and runs test suites, edge cases, integration tests' },
    { title: 'Ship', detail: 'DevOps Manager prepares release, creates PR, validates CI readiness' }
  ]
}

// args = { usecase: string, type?: string, constraints?: string[], cwd?: string, priority?: string }

const usecase = args.usecase
const type = args.type || 'build'
const constraints = args.constraints || []
const cwd = args.cwd || '.'
const priority = args.priority || 'medium'

// ─── SCHEMAS ────────────────────────────────────────────────────────────

const PM_SCHEMA = {
  type: 'object',
  properties: {
    product_brief: { type: 'string' },
    user_stories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          as_a: { type: 'string' },
          i_want: { type: 'string' },
          so_that: { type: 'string' },
          acceptance_criteria: { type: 'array', items: { type: 'string' } },
          priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] }
        },
        required: ['id', 'as_a', 'i_want', 'so_that', 'acceptance_criteria', 'priority']
      }
    },
    non_functional_requirements: { type: 'array', items: { type: 'string' } },
    out_of_scope: { type: 'array', items: { type: 'string' } },
    success_metrics: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } }
  },
  required: ['product_brief', 'user_stories', 'success_metrics']
}

const ARCHITECT_SCHEMA = {
  type: 'object',
  properties: {
    technical_design: { type: 'string' },
    architecture_pattern: { type: 'string' },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          responsibility: { type: 'string' },
          interfaces: { type: 'array', items: { type: 'string' } },
          file_path: { type: 'string' }
        },
        required: ['name', 'responsibility', 'file_path']
      }
    },
    data_models: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } } }, required: ['name', 'fields'] } },
    dependencies: { type: 'array', items: { type: 'string' } },
    build_order: { type: 'array', items: { type: 'string' } },
    api_contracts: { type: 'array', items: { type: 'object', properties: { endpoint: { type: 'string' }, method: { type: 'string' }, description: { type: 'string' } }, required: ['endpoint', 'method'] } },
    tech_decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, rationale: { type: 'string' }, alternatives_considered: { type: 'array', items: { type: 'string' } } }, required: ['decision', 'rationale'] } }
  },
  required: ['technical_design', 'architecture_pattern', 'components', 'build_order']
}

const DEVELOPER_SCHEMA = {
  type: 'object',
  properties: {
    component_name: { type: 'string' },
    files_created: { type: 'array', items: { type: 'string' } },
    files_modified: { type: 'array', items: { type: 'string' } },
    tests_written: { type: 'integer' },
    tests_passing: { type: 'integer' },
    implementation_notes: { type: 'string' },
    api_endpoints_implemented: { type: 'array', items: { type: 'string' } },
    known_limitations: { type: 'array', items: { type: 'string' } }
  },
  required: ['component_name', 'files_created', 'files_modified', 'tests_written', 'tests_passing']
}

const REVIEWER_SCHEMA = {
  type: 'object',
  properties: {
    review_verdict: { type: 'string', enum: ['approved', 'changes_requested', 'blocked'] },
    critical_issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line_range: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor', 'nitpick'] },
          category: { type: 'string', enum: ['bug', 'security', 'performance', 'design', 'style', 'maintainability'] },
          description: { type: 'string' },
          suggested_fix: { type: 'string' }
        },
        required: ['file', 'severity', 'category', 'description']
      }
    },
    architecture_compliance: { type: 'boolean' },
    test_coverage_adequate: { type: 'boolean' },
    code_quality_score: { type: 'integer' },
    suggestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['review_verdict', 'critical_issues', 'architecture_compliance', 'test_coverage_adequate', 'code_quality_score']
}

const TESTER_SCHEMA = {
  type: 'object',
  properties: {
    test_plan: { type: 'string' },
    test_suites_written: { type: 'integer' },
    test_cases_total: { type: 'integer' },
    test_cases_passing: { type: 'integer' },
    test_cases_failing: { type: 'integer' },
    coverage_percentage: { type: 'integer' },
    edge_cases_found: { type: 'array', items: { type: 'string' } },
    integration_tests: { type: 'integer' },
    regression_tests: { type: 'integer' },
    performance_tests: { type: 'integer' },
    bugs_found: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'critical', 'major', 'minor'] },
          reproduction_steps: { type: 'string' },
          expected: { type: 'string' },
          actual: { type: 'string' }
        },
        required: ['title', 'severity', 'reproduction_steps']
      }
    }
  },
  required: ['test_plan', 'test_suites_written', 'test_cases_total', 'test_cases_passing', 'test_cases_failing']
}

const QA_SCHEMA = {
  type: 'object',
  properties: {
    qa_verdict: { type: 'string', enum: ['pass', 'conditional_pass', 'fail'] },
    acceptance_criteria_met: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criteria: { type: 'string' },
          status: { type: 'string', enum: ['met', 'partially_met', 'not_met'] },
          evidence: { type: 'string' }
        },
        required: ['criteria', 'status', 'evidence']
      }
    },
    user_stories_validated: { type: 'integer' },
    user_stories_total: { type: 'integer' },
    release_blockers: { type: 'array', items: { type: 'string' } },
    sign_off: { type: 'boolean' },
    release_notes: { type: 'string' }
  },
  required: ['qa_verdict', 'acceptance_criteria_met', 'sign_off']
}

const DEVOPS_SCHEMA = {
  type: 'object',
  properties: {
    pr_created: { type: 'boolean' },
    pr_url: { type: 'string' },
    branch_name: { type: 'string' },
    commit_count: { type: 'integer' },
    ci_ready: { type: 'boolean' },
    release_summary: { type: 'string' },
    files_changed_total: { type: 'integer' },
    deployment_notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['pr_created', 'branch_name', 'ci_ready', 'release_summary']
}

// ─── PHASE 1: PRODUCT MANAGER ───────────────────────────────────────────

phase('PM')
log(`[PM] Analyzing usecase: "${usecase}"`)

const pmOutput = await agent(
  `You are the PRODUCT MANAGER on this team. The Engineering Director has given you this mission:

Usecase: "${usecase}"
Type: ${type}
Priority: ${priority}
Constraints: ${JSON.stringify(constraints)}

Your job is to produce a product brief that the engineering team can execute against. Do the following:

1. Write a clear 2-3 sentence product brief summarizing WHAT we're building and WHY
2. Break it into user stories (MoSCoW prioritized):
   - "As a [persona], I want [action], so that [benefit]"
   - Each with measurable acceptance criteria
3. Define non-functional requirements (performance, security, accessibility)
4. Explicitly state what's OUT of scope (prevent scope creep)
5. Define success metrics (how do we know this shipped well?)
6. Flag risks that could derail delivery

Think like a PM — focus on user value, not technical implementation. The Architect will figure out the HOW. You define the WHAT and WHY.

Use MoSCoW: must-have stories ship in v1, should-have ship same sprint, could-have next sprint, won't-have is explicitly deferred.`,
  { schema: PM_SCHEMA, label: 'pm:requirements', effort: 'medium' }
)

const mustHaveCount = pmOutput.user_stories.filter(s => s.priority === 'must').length
log(`[PM] Brief ready: ${pmOutput.user_stories.length} stories (${mustHaveCount} must-have), ${pmOutput.success_metrics.length} metrics`)

// ─── PHASE 2: ARCHITECT / TECH LEAD ────────────────────────────────────

phase('Architect')
log('[Architect] Designing technical solution...')

const architecture = await agent(
  `You are the TECH LEAD / ARCHITECT. The PM has delivered requirements. Design the technical solution.

Product brief: "${pmOutput.product_brief}"
User stories: ${JSON.stringify(pmOutput.user_stories)}
Non-functional requirements: ${JSON.stringify(pmOutput.non_functional_requirements)}
Constraints: ${JSON.stringify(constraints)}
Working directory: ${cwd}

Your job:
1. Choose an architecture pattern (monolith, microservice, modular, plugin, etc.) and justify it
2. Define components — each with a single responsibility, clear interfaces, and a target file path
3. Define data models with fields
4. Specify build order (what to implement first for minimum integration pain)
5. Define API contracts if applicable
6. Document key technical decisions with rationale and alternatives considered

RULES:
- Search the existing codebase first — follow established patterns
- Don't over-architect — match complexity to the problem
- Every component must map to at least one user story
- Build order should enable incremental testing (no "big bang" integration)`,
  { schema: ARCHITECT_SCHEMA, label: 'architect:design', effort: 'high' }
)

log(`[Architect] Design: ${architecture.architecture_pattern} pattern, ${architecture.components.length} components, ${architecture.build_order.length} build steps`)

// ─── PHASE 3: DEVELOPERS (parallel implementation) ──────────────────────

phase('Develop')
log(`[Dev Team] ${architecture.components.length} developers assigned, building in parallel...`)

const devResults = await parallel(
  architecture.build_order.map((stepName, i) => () => {
    const component = architecture.components.find(c => c.name === stepName) || architecture.components[i] || { name: stepName, responsibility: stepName, file_path: '' }

    return agent(
      `You are DEVELOPER #${i + 1} on the team. Implement your assigned component.

Component: "${component.name}"
Responsibility: ${component.responsibility}
Target file: ${component.file_path}
Interfaces: ${JSON.stringify(component.interfaces || [])}

Architecture context:
- Pattern: ${architecture.architecture_pattern}
- All components: ${architecture.components.map(c => c.name).join(', ')}
- Data models: ${JSON.stringify(architecture.data_models)}
- Dependencies: ${JSON.stringify(architecture.dependencies)}

Relevant user stories:
${JSON.stringify(pmOutput.user_stories.filter(s => s.priority === 'must' || s.priority === 'should'))}

RULES — TDD methodology:
1. Write TESTS FIRST for your component (unit tests at minimum)
2. Implement until tests pass
3. Follow existing code conventions in the repo
4. Document known limitations honestly
5. Don't break existing tests
6. Make atomic, well-messaged commits

Your output should reflect what you actually built, not aspirations.`,
      { schema: DEVELOPER_SCHEMA, label: `dev:${component.name}`, phase: 'Develop', effort: 'high', isolation: 'worktree' }
    )
  })
)

const validDevResults = devResults.filter(Boolean)
const totalFilesCreated = validDevResults.reduce((sum, d) => sum + d.files_created.length, 0)
const totalTestsWritten = validDevResults.reduce((sum, d) => sum + d.tests_written, 0)
const totalTestsPassing = validDevResults.reduce((sum, d) => sum + d.tests_passing, 0)
log(`[Dev Team] Built: ${totalFilesCreated} files, ${totalTestsPassing}/${totalTestsWritten} tests passing`)

// ─── PHASE 4: SENIOR REVIEWER (code review) ─────────────────────────────

phase('Review')
log('[Reviewer] Senior code review in progress...')

const reviewResult = await agent(
  `You are the SENIOR CODE REVIEWER. Review ALL code produced by the development team.

Architecture design: ${JSON.stringify(architecture)}
Developer outputs: ${JSON.stringify(validDevResults)}
User stories for reference: ${JSON.stringify(pmOutput.user_stories)}

Your review checklist:
1. BUGS — logic errors, off-by-one, null handling, race conditions
2. SECURITY — injection, auth bypass, data exposure, secrets in code
3. PERFORMANCE — N+1 queries, unnecessary allocations, blocking calls, missing caching
4. DESIGN — does implementation match the architecture? Single responsibility? DRY?
5. MAINTAINABILITY — naming, documentation, complexity, coupling
6. TEST COVERAGE — are tests meaningful? Do they cover edge cases? Can they catch regressions?

For each issue found:
- Specify file, severity (critical/major/minor/nitpick), category, and a suggested fix
- Critical and major issues = changes_requested
- Only nitpicks/suggestions = approved

Score code quality 1-10. Be thorough but fair — don't bikeshed.`,
  { schema: REVIEWER_SCHEMA, label: 'reviewer:code-review', effort: 'high' }
)

log(`[Reviewer] Verdict: ${reviewResult.review_verdict} | Quality: ${reviewResult.code_quality_score}/10 | Issues: ${reviewResult.critical_issues.length}`)

// Auto-fix if changes requested (Developer fixes, then re-review once)
let fixApplied = false
if (reviewResult.review_verdict === 'changes_requested') {
  const criticalIssues = reviewResult.critical_issues.filter(i => i.severity === 'critical' || i.severity === 'major')
  if (criticalIssues.length > 0) {
    log(`[Dev Team] Fixing ${criticalIssues.length} critical/major issues...`)

    await agent(
      `You are the LEAD DEVELOPER in FIX MODE. The code review found issues that must be fixed before merge.

Issues to fix:
${JSON.stringify(criticalIssues, null, 2)}

Suggestions from reviewer:
${JSON.stringify(reviewResult.suggestions)}

Fix each issue. Run tests after fixes to ensure nothing regressed. Make a clean commit for the fixes.`,
      { schema: DEVELOPER_SCHEMA, label: 'dev:fix-review-issues', phase: 'Review', effort: 'medium' }
    )
    fixApplied = true
    log('[Dev Team] Review issues fixed')
  }
}

// ─── PHASE 5: TESTER + QA ENGINEER ──────────────────────────────────────

phase('Test')
log('[Tester] Writing comprehensive test suites...')

const testResult = await agent(
  `You are the QA/TEST ENGINEER. Write and run comprehensive tests for the implemented features.

Product requirements: ${JSON.stringify(pmOutput.user_stories)}
Architecture: ${JSON.stringify(architecture)}
Implementation: ${JSON.stringify(validDevResults)}
Review notes: ${JSON.stringify(reviewResult.suggestions)}

Your testing strategy:
1. UNIT TESTS — test each component in isolation (mock dependencies)
2. INTEGRATION TESTS — test components working together
3. EDGE CASES — null inputs, boundary values, concurrent access, error paths
4. REGRESSION TESTS — ensure existing functionality still works
5. PERFORMANCE TESTS — basic load/stress if applicable

For each bug found:
- Write a failing test that reproduces it
- Document reproduction steps, expected vs actual
- Rate severity: blocker (can't ship), critical (must fix), major (should fix), minor (can defer)

Your goal: achieve high confidence that the acceptance criteria are met. Run all tests and report results honestly.`,
  { schema: TESTER_SCHEMA, label: 'tester:test-suites', effort: 'high' }
)

log(`[Tester] Results: ${testResult.test_cases_passing}/${testResult.test_cases_total} passing, ${testResult.bugs_found.length} bugs found, ${testResult.edge_cases_found.length} edge cases covered`)

// Fix blocker/critical bugs found by tester
const blockerBugs = testResult.bugs_found.filter(b => b.severity === 'blocker' || b.severity === 'critical')
if (blockerBugs.length > 0) {
  log(`[Dev Team] Fixing ${blockerBugs.length} blocker/critical bugs from testing...`)

  await agent(
    `You are the LEAD DEVELOPER in BUG FIX MODE. Testing found critical bugs that block release.

Bugs to fix:
${JSON.stringify(blockerBugs, null, 2)}

For each bug:
1. Reproduce using the steps provided
2. Fix the root cause (not just the symptom)
3. Verify the corresponding test now passes
4. Run full test suite to check for regressions`,
    { schema: DEVELOPER_SCHEMA, label: 'dev:fix-bugs', phase: 'Test', effort: 'medium' }
  )
  log('[Dev Team] Critical bugs fixed')
}

// ─── QA SIGN-OFF ────────────────────────────────────────────────────────

log('[QA] Final acceptance validation...')

const qaResult = await agent(
  `You are the QA MANAGER giving final sign-off before release.

Original user stories with acceptance criteria:
${JSON.stringify(pmOutput.user_stories)}

Success metrics defined by PM:
${JSON.stringify(pmOutput.success_metrics)}

Test results:
${JSON.stringify(testResult)}

Review results:
${JSON.stringify(reviewResult)}

Code was fixed after review: ${fixApplied}
Bugs were fixed after testing: ${blockerBugs.length > 0}

Your job:
1. Validate EACH acceptance criterion — did we meet it? What's the evidence?
2. Count validated user stories vs total
3. Identify any release blockers remaining
4. Give final verdict: pass / conditional_pass / fail
5. Write release notes summarizing what ships

A "conditional_pass" means: can ship with known minor issues documented.
A "fail" means: must-have criteria are not met, cannot ship.

Sign off ONLY if you're confident the product meets the Director's intent.`,
  { schema: QA_SCHEMA, label: 'qa:sign-off', effort: 'medium' }
)

log(`[QA] Verdict: ${qaResult.qa_verdict} | Stories validated: ${qaResult.user_stories_validated}/${qaResult.user_stories_total} | Sign-off: ${qaResult.sign_off}`)

// ─── PHASE 6: DEVOPS MANAGER (ship) ─────────────────────────────────────

phase('Ship')

if (!qaResult.sign_off && qaResult.qa_verdict === 'fail') {
  log('[DevOps] BLOCKED — QA did not sign off. Cannot ship.')
  return {
    mission: usecase,
    status: 'blocked',
    reason: 'QA sign-off failed',
    blockers: qaResult.release_blockers,
    pm: { stories: pmOutput.user_stories.length, must_have: mustHaveCount },
    architecture: { pattern: architecture.architecture_pattern, components: architecture.components.length },
    development: { files_created: totalFilesCreated, tests: `${totalTestsPassing}/${totalTestsWritten}` },
    review: { verdict: reviewResult.review_verdict, quality: reviewResult.code_quality_score },
    testing: { passing: testResult.test_cases_passing, failing: testResult.test_cases_failing, bugs: testResult.bugs_found.length },
    qa: { verdict: qaResult.qa_verdict, validated: `${qaResult.user_stories_validated}/${qaResult.user_stories_total}` }
  }
}

log('[DevOps] Preparing release with LUFO verification...')

const shipResult = await agent(
  `You are the DEVOPS MANAGER. Ship the validated work AND VERIFY TO COMPLETION.

QA verdict: ${qaResult.qa_verdict}
Release notes from QA: ${qaResult.release_notes}
All files created/modified across developers: ${JSON.stringify(validDevResults.map(d => ({ component: d.component_name, created: d.files_created, modified: d.files_modified })))}

Your tasks:
1. Stage all relevant changes (exclude temp files, .env, node_modules, etc.)
2. Create well-structured atomic commits with clear messages
3. Push to remote — VERIFY the push succeeds (exit 0). If rejected, diagnose and retry.
4. Create or update a PR with:
   - Title referencing the usecase
   - Description with user stories delivered
   - Test results summary
   - QA sign-off status
   - Any deployment notes
5. VERIFY the PR was created — return the actual URL (not "will create")
6. If a deploy target exists (Vercel, etc.):
   - Trigger deploy
   - POLL until status is Ready (max 5 min, check every 30s)
   - VERIFY the live URL returns HTTP 200
   - If deploy fails: diagnose, fix, retry (max 3 attempts)
   - Only escalate if it's a TRUE external blocker (paid feature, auth token, etc.)

CRITICAL — LOOP UNTIL FINAL OUTPUT (LUFO):
- Do NOT stop at "triggered" or "submitted". VERIFY the end state.
- Do NOT tell the user to check anything. YOU check it.
- Do NOT give the user steps to run. YOU run them.
- Your output must report PROVEN outcomes, not predictions.

PR description should be useful to future developers reading git history.`,
  { schema: DEVOPS_SCHEMA, label: 'devops:ship', effort: 'high' }
)

log(`[DevOps] ${shipResult.pr_created ? 'PR created' : 'Changes committed'}: ${shipResult.release_summary}`)

// ─── DIRECTOR'S BRIEF ───────────────────────────────────────────────────

return {
  mission: usecase,
  status: qaResult.sign_off ? 'shipped' : 'conditional',
  type: type,
  priority: priority,

  pm: {
    stories_total: pmOutput.user_stories.length,
    must_have: mustHaveCount,
    success_metrics: pmOutput.success_metrics
  },

  architecture: {
    pattern: architecture.architecture_pattern,
    components: architecture.components.length,
    tech_decisions: architecture.tech_decisions.length
  },

  development: {
    components_built: validDevResults.length,
    files_created: totalFilesCreated,
    tests_written: totalTestsWritten,
    tests_passing: totalTestsPassing
  },

  review: {
    verdict: reviewResult.review_verdict,
    quality_score: reviewResult.code_quality_score,
    issues_found: reviewResult.critical_issues.length,
    fix_applied: fixApplied
  },

  testing: {
    suites: testResult.test_suites_written,
    cases_total: testResult.test_cases_total,
    passing: testResult.test_cases_passing,
    failing: testResult.test_cases_failing,
    bugs_found: testResult.bugs_found.length,
    blocker_bugs_fixed: blockerBugs.length
  },

  qa: {
    verdict: qaResult.qa_verdict,
    stories_validated: qaResult.user_stories_validated,
    stories_total: qaResult.user_stories_total,
    sign_off: qaResult.sign_off,
    release_notes: qaResult.release_notes
  },

  ship: shipResult
}
