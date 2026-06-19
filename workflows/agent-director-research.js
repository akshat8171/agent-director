export const meta = {
  name: 'agent-director-research',
  description: 'Research-only mission: fan-out multi-source investigation, synthesize findings',
  whenToUse: 'When the Director needs research/investigation without code changes',
  phases: [
    { title: 'Scope', detail: 'Parse research question, identify sources and angles' },
    { title: 'Gather', detail: 'Parallel research agents across multiple sources' },
    { title: 'Verify', detail: 'Adversarially verify key claims' },
    { title: 'Synthesize', detail: 'Compose structured findings report' }
  ]
}

// args = { question: string, sources?: string[], depth?: 'quick' | 'thorough' | 'exhaustive' }

const question = args.question
const sources = args.sources || ['codebase', 'slack', 'docs', 'web']
const depth = args.depth || 'thorough'

const SCOPE_SCHEMA = {
  type: 'object',
  properties: {
    sub_questions: { type: 'array', items: { type: 'string' } },
    search_strategies: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, query: { type: 'string' }, rationale: { type: 'string' } }, required: ['source', 'query'] } },
    expected_answer_shape: { type: 'string' }
  },
  required: ['sub_questions', 'search_strategies']
}

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, evidence: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, url: { type: 'string' } }, required: ['claim', 'evidence', 'confidence'] } },
    gaps: { type: 'array', items: { type: 'string' } }
  },
  required: ['source', 'findings']
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    claim: { type: 'string' },
    verified: { type: 'boolean' },
    counter_evidence: { type: 'string' },
    revised_confidence: { type: 'string', enum: ['high', 'medium', 'low', 'refuted'] }
  },
  required: ['claim', 'verified', 'revised_confidence']
}

// Phase 1: Scope
phase('Scope')
log(`Research mission: "${question}"`)

const scope = await agent(
  `You are a Research Director scoping an investigation.

Question: "${question}"
Available sources: ${JSON.stringify(sources)}
Depth: ${depth}

Break this into 3-5 sub-questions that, if answered, would fully address the main question.
For each sub-question, specify which source to search and what query to use.
Describe the shape of the expected answer (e.g., "a list of APIs with their endpoints" or "a timeline of events").`,
  { schema: SCOPE_SCHEMA, label: 'scope:decompose' }
)

log(`Scoped: ${scope.sub_questions.length} sub-questions, ${scope.search_strategies.length} search strategies`)

// Phase 2: Gather (parallel researchers per source)
phase('Gather')
log(`Dispatching ${scope.search_strategies.length} research agents...`)

const findings = await parallel(
  scope.search_strategies.map((strategy, i) => () =>
    agent(
      `You are a specialist researcher. Find information to answer this question:

Main question: "${question}"
Your specific focus: "${scope.sub_questions[Math.min(i, scope.sub_questions.length - 1)]}"
Search in: ${strategy.source}
Query approach: ${strategy.query}
Rationale: ${strategy.rationale || 'Direct search'}

Search thoroughly. Report all findings with evidence (quotes, URLs, file paths). Note confidence level for each finding. Also note any gaps — things you expected to find but didn't.`,
      { schema: FINDING_SCHEMA, label: `gather:${strategy.source}:${i}`, phase: 'Gather' }
    )
  )
)

const validFindings = findings.filter(Boolean)
const totalClaims = validFindings.reduce((sum, f) => sum + f.findings.length, 0)
log(`Gathered: ${totalClaims} claims from ${validFindings.length} sources`)

// Phase 3: Verify (adversarial check on high-value claims)
phase('Verify')
const highValueClaims = validFindings
  .flatMap(f => f.findings)
  .filter(f => f.confidence !== 'low')
  .slice(0, depth === 'exhaustive' ? 10 : depth === 'thorough' ? 5 : 3)

log(`Verifying ${highValueClaims.length} key claims...`)

const verifications = await parallel(
  highValueClaims.map((claim, i) => () =>
    agent(
      `You are a skeptical verifier. Try to REFUTE this claim. Look for counter-evidence, contradictions, or outdated information.

Claim: "${claim.claim}"
Evidence provided: "${claim.evidence}"
Source confidence: ${claim.confidence}

Search for contradicting information. If you cannot refute it, mark it verified. Default to verified=false if uncertain.`,
      { schema: VERDICT_SCHEMA, label: `verify:${i}`, phase: 'Verify' }
    )
  )
)

const verified = verifications.filter(Boolean).filter(v => v.verified)
const refuted = verifications.filter(Boolean).filter(v => !v.verified)
log(`Verified: ${verified.length} confirmed, ${refuted.length} refuted/uncertain`)

// Phase 4: Synthesize
phase('Synthesize')
const report = await agent(
  `You are a Research Synthesizer. Compose the final findings report for the Director.

Original question: "${question}"
Sub-questions investigated: ${JSON.stringify(scope.sub_questions)}

All findings by source:
${JSON.stringify(validFindings, null, 2)}

Verification results:
- Confirmed claims: ${JSON.stringify(verified)}
- Refuted/uncertain claims: ${JSON.stringify(refuted)}

Gaps identified:
${validFindings.map(f => f.gaps.join(', ')).filter(Boolean).join('; ')}

Compose a structured research report with:
1. Executive summary (3 sentences max)
2. Key findings (bullet points, with confidence levels)
3. Verified facts vs uncertain claims
4. Gaps and open questions
5. Recommended next steps

Be concise. The Director needs actionable intelligence, not a wall of text.`,
  { label: 'synthesize:report' }
)

return {
  question: question,
  sources_searched: validFindings.length,
  claims_found: totalClaims,
  claims_verified: verified.length,
  claims_refuted: refuted.length,
  report: report
}
