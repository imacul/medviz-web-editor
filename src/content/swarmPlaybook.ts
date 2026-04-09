export type SwarmAgentCard = {
  id: string;
  name: string;
  mission: string;
  owns: string[];
  outputs: string[];
  kpi: string;
  promptPath: string;
};

export const swarmAgentCards: SwarmAgentCard[] = [
  {
    id: 'founder-operator',
    name: 'Founder-Operator',
    mission: 'Own weekly revenue decisions, approve high-risk actions, and reallocate the swarm toward the current bottleneck.',
    owns: ['Revenue target', 'Offer packaging', 'Priority calls', 'Weekly operating memo'],
    outputs: ['Weekly decision memo', 'Approved experiments', 'Blocked-risk decisions'],
    kpi: 'Closed pilots per month',
    promptPath: 'docs/swarm-prompts/founder-operator.md',
  },
  {
    id: 'demand-gen',
    name: 'Demand Gen',
    mission: 'Keep MedViz focused on oral surgery and implant-team buyers and generate fit-ranked lead supply.',
    owns: ['ICP refinement', 'Lead sourcing', 'Segment reports', 'Lead hygiene'],
    outputs: ['Ranked lead batches', 'Segment notes', 'Fit reasons with source links'],
    kpi: 'Qualified new leads per week',
    promptPath: 'docs/swarm-prompts/demand-gen.md',
  },
  {
    id: 'outreach-operator',
    name: 'Outreach Operator',
    mission: 'Turn approved leads into reviewed outreach batches, follow-up queues, and safe send plans.',
    owns: ['Email copy', 'Follow-up sequencing', 'CSV batch prep', 'Suppression tracking'],
    outputs: ['Send-ready drafts', 'Follow-up queue', 'Duplicate and bounce controls'],
    kpi: 'Positive reply rate',
    promptPath: 'docs/swarm-prompts/outreach-operator.md',
  },
  {
    id: 'reply-triage',
    name: 'Reply Triage',
    mission: 'Classify replies fast, route the next action, and draft safe first responses.',
    owns: ['Inbox monitoring', 'Reply classification', 'Routing', 'Safe acknowledgments'],
    outputs: ['Classified inbox', 'Suggested responses', 'Escalation flags'],
    kpi: 'Median time to first useful response',
    promptPath: 'docs/swarm-prompts/reply-triage.md',
  },
  {
    id: 'qualification-closing',
    name: 'Qualification & Closing',
    mission: 'Qualify real workflow pain, tighten scope, and move serious prospects into paid pilots.',
    owns: ['Discovery prep', 'Objection handling', 'Scope summaries', 'Call follow-up'],
    outputs: ['Call briefs', 'Qualification summaries', 'Next-step recommendation'],
    kpi: 'Call-to-pilot conversion rate',
    promptPath: 'docs/swarm-prompts/qualification-closing.md',
  },
  {
    id: 'pilot-delivery',
    name: 'Pilot Delivery & Success',
    mission: 'Get one de-identified case to first success quickly and surface expansion signals.',
    owns: ['Kickoff checklist', 'Milestone tracking', 'Blocked onboarding', 'Renewal signals'],
    outputs: ['Pilot plan', 'Day 1/3/7 checkpoint updates', 'Expansion recommendation'],
    kpi: 'First-case success within 7 days',
    promptPath: 'docs/swarm-prompts/pilot-delivery-success.md',
  },
  {
    id: 'product-intelligence',
    name: 'Product Intelligence',
    mission: 'Convert demo friction, pilot feedback, and support signals into ranked build priorities.',
    owns: ['Feedback synthesis', 'Friction ranking', 'Roadmap evidence', 'Churn-risk tracking'],
    outputs: ['Weekly top-5 friction list', 'Feature recommendation memo', 'Trust-gap notes'],
    kpi: 'High-friction issues reduced per month',
    promptPath: 'docs/swarm-prompts/product-intelligence.md',
  },
  {
    id: 'support-compliance',
    name: 'Support & Compliance',
    mission: 'Protect trust by handling policy consistency, refunds, support drafts, and privacy messaging.',
    owns: ['Support inbox', 'Refund routing', 'Policy consistency', 'Trust-gap checklist'],
    outputs: ['Support drafts', 'Refund recommendation', 'Compliance escalation notes'],
    kpi: 'Time to resolution',
    promptPath: 'docs/swarm-prompts/support-compliance.md',
  },
];

export const swarmApprovalGates = [
  'Outbound sending requires explicit approval on the current batch.',
  'Pricing, discounts, refunds, and payment terms stay human-approved.',
  'Compliance, privacy, or clinical claims cannot be changed autonomously.',
  'Roadmap commitments to prospects require founder approval.',
];

export const swarmDailyCadence = [
  'Demand Gen: source 10 to 20 net-new fit leads and update fit reasons.',
  'Outreach Operator: prepare one new batch and one follow-up batch for review.',
  'Reply Triage: classify all new replies and route the next action.',
  'Qualification & Closing: prep active calls and publish same-day follow-up summaries.',
  'Pilot Delivery: review active pilots, blockers, and first-case milestones.',
  'Product Intelligence: log funnel friction, objections, and feature demand.',
];

export const swarmKpis = [
  'Unique demo visitors per week',
  'Demo-to-signup conversion rate',
  'Signup-to-case-created conversion rate',
  'Case-created-to-share conversion rate',
  'Positive outreach reply rate',
  'Call booking rate',
  'Call-to-pilot close rate',
  'Time to first pilot success',
  'Monthly active teams',
  'Renewal or expansion rate',
];

export const executionAssets = [
  {
    label: 'Swarm playbook',
    path: 'docs/agent-swarm-business.md',
    note: 'Operating model, KPIs, handoffs, and first-30-days plan.',
  },
  {
    label: 'Prompt pack',
    path: 'docs/swarm-prompts/',
    note: 'Role-specific executable prompt files for each agent.',
  },
  {
    label: 'Outreach records',
    path: 'outreach/',
    note: 'Lead lists, Gmail batches, send logs, follow-up notes, and reply state.',
  },
  {
    label: 'Gmail reply monitor',
    path: 'scripts/gmail_reply_monitor.py',
    note: 'Inbox polling and reply-state tracking.',
  },
  {
    label: 'Gmail realtime responder',
    path: 'scripts/gmail_realtime_responder.py',
    note: 'Safe auto-acknowledgment helper for low-risk replies.',
  },
  {
    label: 'Outreach skill',
    path: 'C:/Users/HP/.codex/skills/app-test-review-outreach/SKILL.md',
    note: 'Lead sourcing, message drafting, Gmail-safe batch workflow, and outreach guardrails.',
  },
];

export const automationBlueprints = [
  {
    name: 'Weekday Outreach Prep',
    schedule: 'Weekdays at 09:00 Africa/Lagos',
    purpose:
      'Prepare a reviewed outreach batch, classify new replies, and open an inbox item with send-ready work and blockers.',
  },
  {
    name: 'Daily Swarm Closeout',
    schedule: 'Every day at 18:30 Africa/Lagos',
    purpose:
      'Send a daily work message to the user as a Codex inbox item with completed work, blockers, KPIs, and next actions.',
  },
];

export const nextBuildPriorities = [
  'Add a lightweight CRM layer for prospects, pilots, stage changes, and account owners.',
  'Expand analytics to capture demo import, signup, case creation, share, comment, and first export.',
  'Create pilot onboarding records with target workflow, owner, milestone status, and renewal decision.',
  'Add feedback capture after demo use and after pilot milestones.',
  'Separate free-demo simulated collaboration from persistent collaboration in copy and UI.',
];
