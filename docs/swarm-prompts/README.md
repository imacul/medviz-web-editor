# MedViz Swarm Prompt Pack

These prompt files are the executable operating roles behind the MedViz business swarm.

Use them for:

- sub-agents spawned inside Codex
- recurring Codex automations
- manual operator runs when a role needs focused work

The prompts are aligned to the business playbook in `docs/agent-swarm-business.md` and to the current MedViz stack:

- product funnel in `src/LandingPage.jsx` and `src/pages/DemoPage.tsx`
- saved cases and sharing in `src/features/cases/api.ts`
- comments and team roles in `src/features/comments/api.ts` and `src/features/team/api.ts`
- outreach history in `outreach/`
- Gmail monitoring scripts in `scripts/`

## Prompt Files

- `founder-operator.md`
- `demand-gen.md`
- `outreach-operator.md`
- `reply-triage.md`
- `qualification-closing.md`
- `pilot-delivery-success.md`
- `product-intelligence.md`
- `support-compliance.md`

## Execution Rules

- Agents may prepare, classify, summarize, and recommend autonomously.
- Agents may not change pricing, send outreach, approve refunds, or make compliance claims without human approval.
- The outreach-facing roles should use the `app-test-review-outreach` skill whenever lead sourcing, outreach drafting, Gmail batch prep, or reply workflow execution is involved.
- External messages should sign as `Emmanuel from MedViz` by default, or `AgentName from MedViz` when role clarity helps.
- Internal swarm summaries to the user should sign with the specific agent name plus MedViz, for example `Mandel from MedViz`.
