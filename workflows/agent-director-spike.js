export const meta = {
  name: 'agent-director-spike',
  description: 'Technical spike: parallel exploration of approaches before committing to implementation',
  whenToUse: 'When the Director needs feasibility analysis, POC comparison, or approach selection before a full build',
  phases: [
    { title: 'Scope', detail: 'PM defines spike objectives, success criteria, and time-box' },
    { title: 'Explore', detail: 'Parallel developers spike different approaches independently' },
    { title: 'Evaluate', detail: 'Reviewer + QA assess each approach on feasibility, risk, and fit' },
    { title: 'Recommend', detail: 'Manager synthesizes findings into go/no-go recommendation' }
  ]
}

// args = { question: string, approaches?: string[], constraints?: string[], max_approaches?: number }

const question = args.question
const suggestedApproaches = args.approaches || []
const constraints = args.constraints || []
const maxApproaches = args.max_approaches || 3

const SCOPE_SCHEMA = {
  type: 'object',
  properties: {
    spike_objective: { type: 'string' },
    success_criteria: { type: 'array', items: { type: 'string' } },
    approaches_to_explore: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          hypothesis: { type: 'string' }
        },
        required: ['name', 'description', 'hypothesis']
      }
    },
    out_of_scope: { type: 'array', items: { type: 'string' } },
    risks_to_watch: { type: 'array', items: { type: 'string' } }
  },
  required: ['spike_objective', 'success_criteria', 'approaches_to_explore']
}

const SPIKE_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    approach_name: { type: 'string' },
    feasibility: { type: 'string', enum: ['proven', 'likely', 'uncertain', 'infeasible'] },
    poc_summary: { type: 'string' },
    code_complexity: { type: 'string', enum: ['trivial', 'moderate', 'complex', 'very_complex'] },
    dependencies_discovered: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    estimated_effort: { type: 'string' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
    sample_code_path: { type: 'string' }
  },
  required: ['approach_name', 'feasibility', 'poc_summary', 'code_complexity', 'pros', 'cons']
}

const EVALUATION_SCHEMA = {
  type: 'object',
  properties: {
    approach_name: { type: 'string' },
    testability_score: { type: 'integer' },
    maintainability_score: { type: 'integer' },
    scalability_score: { type: 'integer' },
    security_concerns: { type: 'array', items: { type: 'string' } },
    integration_risks: { type: 'array', items: { type: 'string' } },
    hidden_costs: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string', enum: ['recommend', 'acceptable', 'risky', 'reject'] }
  },
  required: ['approach_name', 'testability_score', 'maintainability_score', 'scalability_score', 'verdict']
}

const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    recommended_approach: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    rationale: { type: 'string' },
    implementation_path: { type: 'array', items: { type: 'string' } },
    risks_accepted: { type: 'array', items: { type: 'string' } },
    next_steps: { type: 'array', items: { type: 'string' } },
    spike_answered: { type: 'boolean' },
    needs_further_spike: { type: 'string' }
  },
  required: ['recommended_approach', 'confidence', 'rationale', 'implementation_path', 'spike_answered']
}

// Phase 1: Scope (Product Manager)
phase('Scope')
log(`Spike mission: "${question}"`)

const scope = await agent(
  `You are the PRODUCT MANAGER scoping a technical spike.

Spike question: "${question}"
Suggested approaches (if any): ${JSON.stringify(suggestedApproaches)}
Constraints: ${JSON.stringify(constraints)}

Your job:
1. Define the spike objective in one clear sentence
2. Set 3-5 measurable success criteria (what would prove an approach works)
3. Identify ${maxApproaches} distinct approaches to explore (use suggested ones if provided, add your own if needed)
4. For each approach, state a hypothesis: "We believe [approach] will work because [reason]"
5. Define what's OUT of scope (prevent scope creep)
6. Flag risks to watch during exploration

Think like a PM — focus on outcomes and user value, not implementation details.`,
  { schema: SCOPE_SCHEMA, label: 'pm:scope-spike', effort: 'medium' }
)

log(`Scoped: ${scope.approaches_to_explore.length} approaches, ${scope.success_criteria.length} success criteria`)

// Phase 2: Explore (Developers — parallel spikes)
phase('Explore')
log(`Dispatching ${scope.approaches_to_explore.length} developers to spike in parallel...`)

const spikeResults = await parallel(
  scope.approaches_to_explore.map((approach, i) => () =>
    agent(
      `You are DEVELOPER #${i + 1} running a technical spike.

Spike objective: "${scope.spike_objective}"
Your assigned approach: "${approach.name}"
Description: ${approach.description}
Hypothesis to validate: "${approach.hypothesis}"
Success criteria: ${JSON.stringify(scope.success_criteria)}
Constraints: ${JSON.stringify(constraints)}

Your job:
1. Research feasibility — search codebase for existing patterns, check for libraries/APIs needed
2. Build a minimal POC (proof of concept) — just enough code to prove/disprove the hypothesis
3. Document what dependencies are needed
4. Identify blockers or showstoppers
5. Estimate full implementation effort (hours/days)
6. List honest pros and cons

Write actual code if it helps prove feasibility. Be HONEST about what doesn't work — a spike that disproves an approach is just as valuable as one that proves it. Don't polish, don't test exhaustively, just validate the core hypothesis.`,
      { schema: SPIKE_RESULT_SCHEMA, label: `dev:spike-${approach.name}`, phase: 'Explore', effort: 'high', isolation: 'worktree' }
    )
  )
)

const validResults = spikeResults.filter(Boolean)
log(`Spikes complete: ${validResults.length} approaches explored`)
const feasibleCount = validResults.filter(r => r.feasibility === 'proven' || r.feasibility === 'likely').length
log(`Feasible: ${feasibleCount}/${validResults.length}`)

// Phase 3: Evaluate (Reviewer + QA)
phase('Evaluate')
log('Reviewer + QA evaluating each approach...')

const evaluations = await parallel(
  validResults.map((result, i) => () =>
    agent(
      `You are a SENIOR REVIEWER and QA ENGINEER evaluating a spike result.

Spike objective: "${scope.spike_objective}"
Success criteria: ${JSON.stringify(scope.success_criteria)}
Constraints: ${JSON.stringify(constraints)}

Approach being evaluated: "${result.approach_name}"
Developer's findings: ${JSON.stringify(result)}

Evaluate on these dimensions (score 1-10):
1. TESTABILITY — How easy is this approach to test thoroughly? Can we write meaningful unit + integration tests?
2. MAINTAINABILITY — Will this be readable, debuggable, and modifiable in 6 months?
3. SCALABILITY — Will this handle 10x the current load without rearchitecting?

Also assess:
- Security concerns (auth, data exposure, injection risks)
- Integration risks (how hard to plug into existing system)
- Hidden costs (operational overhead, monitoring needs, team learning curve)

Give a final verdict: recommend / acceptable / risky / reject.
Be adversarial — your job is to find what the developer missed.`,
      { schema: EVALUATION_SCHEMA, label: `review:${result.approach_name}`, phase: 'Evaluate', effort: 'medium' }
    )
  )
)

const validEvals = evaluations.filter(Boolean)
const recommended = validEvals.filter(e => e.verdict === 'recommend')
log(`Evaluations: ${recommended.length} recommended, ${validEvals.filter(e => e.verdict === 'reject').length} rejected`)

// Phase 4: Recommend (Engineering Manager)
phase('Recommend')
log('Engineering Manager synthesizing recommendation...')

const recommendation = await agent(
  `You are the ENGINEERING MANAGER making the final spike recommendation to the Director.

Spike question: "${question}"
Objective: "${scope.spike_objective}"
Success criteria: ${JSON.stringify(scope.success_criteria)}

Spike results from developers:
${JSON.stringify(validResults, null, 2)}

Evaluations from reviewers:
${JSON.stringify(validEvals, null, 2)}

Your job:
1. Pick the BEST approach (or state "none" if all failed)
2. State your confidence: high/medium/low
3. Explain WHY in 2-3 sentences (the Director doesn't want a novel)
4. Lay out the implementation path (ordered steps to build this for real)
5. List risks you're consciously accepting
6. Define next steps
7. Did the spike answer the original question? If not, what further spike is needed?

Think like an EM — balance technical merit with team capability, timeline, and risk tolerance. The Director needs a decision, not a list of options.`,
  { schema: RECOMMENDATION_SCHEMA, label: 'em:recommend', effort: 'medium' }
)

log(`Recommendation: "${recommendation.recommended_approach}" (${recommendation.confidence} confidence)`)

return {
  spike_question: question,
  approaches_explored: validResults.length,
  feasible_approaches: feasibleCount,
  recommended_approach: recommendation.recommended_approach,
  confidence: recommendation.confidence,
  rationale: recommendation.rationale,
  implementation_path: recommendation.implementation_path,
  spike_answered: recommendation.spike_answered,
  needs_further_spike: recommendation.needs_further_spike || null,
  full_results: validResults,
  evaluations: validEvals
}
