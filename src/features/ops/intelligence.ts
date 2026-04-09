import type {
  CreateOpsLeadInput,
  OpsContactRouteId,
  OpsLead,
  OpsLeadStage,
  OutreachBatchRow,
} from './types';

export const contactRouteLabels: Record<OpsContactRouteId, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  phone: 'Phone',
  website_form: 'Website Form',
  x_dm: 'X DM',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
};

const highFitKeywords = ['oral', 'maxillofacial', 'implant', 'omfs', 'dental surgery', 'jaw'];
const mediumFitKeywords = ['training', 'resident', 'surgical center', 'lab', 'collaborator'];
const genericMailboxPrefixes = new Set([
  'admin',
  'billing',
  'contact',
  'frontdesk',
  'hello',
  'info',
  'marketing',
  'office',
  'reception',
  'support',
  'team',
]);

export function parseContactRoutes(value: string | null | undefined): OpsContactRouteId[] {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is OpsContactRouteId =>
      ['email', 'linkedin', 'phone', 'website_form', 'x_dm', 'whatsapp', 'referral'].includes(item)
    );
}

export function stringifyContactRoutes(routes: OpsContactRouteId[]): string | null {
  if (routes.length === 0) return null;
  return [...new Set(routes)].join(', ');
}

function includesKeyword(source: string | null | undefined, keywords: string[]) {
  const normalized = source?.toLowerCase() ?? '';
  return keywords.some((keyword) => normalized.includes(keyword));
}

function stageScore(stage: OpsLeadStage) {
  switch (stage) {
    case 'won':
      return 20;
    case 'pilot':
      return 18;
    case 'qualified':
      return 16;
    case 'replied':
      return 12;
    case 'contacted':
      return 8;
    case 'sourced':
      return 5;
    case 'lost':
      return 0;
    default:
      return 0;
  }
}

export function scoreLeadFit(lead: OpsLead) {
  const routes = parseContactRoutes(lead.contact_route);
  const fitScore = includesKeyword(lead.segment ?? lead.account_name, highFitKeywords)
    ? 35
    : includesKeyword(lead.segment ?? lead.account_name, mediumFitKeywords)
      ? 24
      : 12;
  const routeScore =
    routes.length === 0
      ? 4
      : Math.min(25, routes.length * 8 + (lead.contact_email ? 6 : 0) + (lead.source_url ? 4 : 0));
  const contextScore =
    (lead.next_action ? 4 : 0) +
    (lead.notes ? 3 : 0) +
    (lead.segment ? 3 : 0);
  const recencyScore = lead.last_reply_at ? 10 : lead.last_outreach_at ? 6 : 0;
  const total = Math.min(100, fitScore + routeScore + contextScore + recencyScore + stageScore(lead.stage));

  return {
    total,
    label: total >= 75 ? 'Verified' : total >= 55 ? 'Promising' : total >= 35 ? 'Needs review' : 'Weak fit',
  };
}

export function recommendNextMove(lead: OpsLead) {
  const routes = parseContactRoutes(lead.contact_route);
  const primaryRoute = routes[0] ?? (lead.contact_email ? 'email' : 'linkedin');

  switch (lead.stage) {
    case 'sourced':
      return `Verify fit, then prepare first-touch ${contactRouteLabels[primaryRoute].toLowerCase()} outreach.`;
    case 'contacted':
      return lead.last_reply_at
        ? 'Classify the reply and decide whether to qualify or nurture.'
        : `Prepare a follow-up on ${contactRouteLabels[primaryRoute].toLowerCase()} or switch to an alternate route.`;
    case 'replied':
      return 'Qualify the workflow pain, define one de-identified pilot path, and recommend demo or call.';
    case 'qualified':
      return 'Prepare a pilot scope summary and founder-approved next step.';
    case 'pilot':
      return 'Track first-case success, blockers, and expansion signals.';
    case 'won':
      return 'Hand off to onboarding and weekly success tracking.';
    case 'lost':
      return 'Store the reason, set a re-engagement date if useful, and stop active pursuit.';
    default:
      return 'Review the lead manually.';
  }
}

export function buildChannelPrep(lead: OpsLead, channel: OpsContactRouteId) {
  const score = scoreLeadFit(lead);
  const nextMove = recommendNextMove(lead);
  const sourceHint = lead.source_url ? `Source/profile URL: ${lead.source_url}` : 'Source/profile URL: not recorded';
  const emailHint = lead.contact_email ? `Email: ${lead.contact_email}` : 'Email: not recorded';
  const whyHint = lead.reason_fit ? `Why this lead: ${lead.reason_fit}` : 'Why this lead: not recorded';

  const cta =
    channel === 'phone'
      ? 'Ask for a short workflow call about one de-identified case review bottleneck.'
      : channel === 'website_form'
        ? 'Ask whether the clinic is open to a short workflow review or pilot discussion.'
        : 'Invite them to review MedViz and reply if one case-review workflow is worth testing.';

  return [
    `Lead: ${lead.contact_name} at ${lead.account_name}`,
    `Channel: ${contactRouteLabels[channel]}`,
    `Fit score: ${score.total}/100 (${score.label})`,
    `Segment: ${lead.segment ?? 'not recorded'}`,
    whyHint,
    sourceHint,
    emailHint,
    `Current stage: ${lead.stage}`,
    `Recommended next move: ${nextMove}`,
    `CTA: ${cta}`,
    'Default sender: Emmanuel from MedViz',
  ].join('\n');
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function summarizeText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractFirstMeaningfulLine(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => Boolean(line));
}

function extractAccountName(row: OutreachBatchRow) {
  const greeting = extractFirstMeaningfulLine(row.body);
  const greetingMatch = greeting?.match(/^hi\s+(.+?)(?:\s+team)?[!,]$/i);
  if (greetingMatch?.[1]) {
    return greetingMatch[1].trim();
  }

  const subjectMatch = row.subject.match(/\bfor\s+(.+?)(?:\s+workflow)?$/i);
  if (subjectMatch?.[1]) {
    return subjectMatch[1].trim();
  }

  const domain = row.email.split('@')[1] ?? row.email;
  return domain.replace(/\.[a-z.]+$/i, '').replace(/[-_]/g, ' ').trim() || row.email;
}

function toTitleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractContactName(row: OutreachBatchRow, accountName: string) {
  const localPart = row.email.split('@')[0]?.trim().toLowerCase() ?? '';

  if (!localPart || genericMailboxPrefixes.has(localPart)) {
    return `${accountName} team`;
  }

  return toTitleCase(localPart);
}

function extractReasonFit(row: OutreachBatchRow) {
  const normalizedBody = row.body.replace(/\s+/g, ' ').trim();
  const becauseMatch = normalizedBody.match(/i reached out because\s+(.+?)(?:\.|$)/i);
  if (becauseMatch?.[1]) {
    return summarizeText(becauseMatch[1], 220);
  }

  const cameAcrossMatch = normalizedBody.match(/i came across\s+(.+?)(?:\.|$)/i);
  if (cameAcrossMatch?.[1]) {
    return `Public lead source indicates ${summarizeText(cameAcrossMatch[1], 190)}`;
  }

  return summarizeText(row.subject || 'Imported from outreach batch.', 220);
}

function inferSegment(row: OutreachBatchRow, accountName: string) {
  const source = `${row.subject} ${row.body} ${accountName}`.toLowerCase();
  if (source.includes('resident') || source.includes('training')) {
    return 'training program';
  }
  if (source.includes('implant')) {
    return 'implant team';
  }
  if (source.includes('oral') || source.includes('maxillofacial') || source.includes('omfs')) {
    return 'oral surgery clinic';
  }
  return 'workflow lead';
}

export function deriveLeadFromBatchRow(
  row: OutreachBatchRow,
  fileName: string
): CreateOpsLeadInput | null {
  const email = row.email.trim();
  if (!email) {
    return null;
  }

  const accountName = extractAccountName(row);
  const contactName = extractContactName(row, accountName);
  const reasonFit = extractReasonFit(row);
  const subjectNote = row.subject ? `Subject: ${summarizeText(row.subject, 180)}` : null;
  const replyToNote = row.reply_to ? `Reply-to: ${row.reply_to}` : null;
  const importNotes = [`Imported from ${fileName}.`, subjectNote, replyToNote]
    .filter(Boolean)
    .join(' ');

  return {
    account_name: accountName,
    contact_name: contactName,
    reason_fit: reasonFit,
    contact_email: email,
    contact_route: 'email',
    segment: inferSegment(row, accountName),
    stage: 'sourced',
    next_action: 'Review the imported lead, verify fit, and prepare founder-approved first touch.',
    notes: importNotes,
  };
}

function leadIdentityKey(input: { contact_email?: string | null; contact_name: string; account_name: string }) {
  const email = input.contact_email?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  return `name:${input.contact_name.trim().toLowerCase()}::${input.account_name.trim().toLowerCase()}`;
}

export function dedupeImportedLeads(inputs: CreateOpsLeadInput[], existingLeads: OpsLead[]) {
  const existingKeys = new Set(existingLeads.map((lead) => leadIdentityKey(lead)));
  const uniqueInputs = new Map<string, CreateOpsLeadInput>();

  for (const input of inputs) {
    const key = leadIdentityKey(input);
    if (!existingKeys.has(key) && !uniqueInputs.has(key)) {
      uniqueInputs.set(key, input);
    }
  }

  return [...uniqueInputs.values()];
}

export function buildOutreachExportCsv(leads: OpsLead[]) {
  const header = [
    'account_name',
    'contact_name',
    'stage',
    'routes',
    'contact_email',
    'source_url',
    'reason_fit',
    'recommended_next_move',
    'next_action',
  ];

  const rows = leads.map((lead) =>
    [
      lead.account_name,
      lead.contact_name,
      lead.stage,
      parseContactRoutes(lead.contact_route)
        .map((route) => contactRouteLabels[route])
        .join(' | '),
      lead.contact_email ?? '',
      lead.source_url ?? '',
      lead.reason_fit ?? '',
      recommendNextMove(lead),
      lead.next_action ?? '',
    ]
      .map((value) => escapeCsvCell(value))
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

export function buildExecutionQueueTsv(leads: OpsLead[]) {
  const header = [
    'Who',
    'Account',
    'Why',
    'Contact info',
    'Routes',
    'Stage',
    'Recommended next move',
  ];

  const rows = leads.map((lead) => {
    const contactInfo = [lead.contact_email, lead.source_url].filter(Boolean).join(' | ') || 'Not recorded';
    const routes =
      parseContactRoutes(lead.contact_route)
        .map((route) => contactRouteLabels[route])
        .join(', ') || 'Not recorded';

    return [
      lead.contact_name,
      lead.account_name,
      summarizeText(lead.reason_fit ?? 'No fit reason recorded.', 180),
      contactInfo,
      routes,
      lead.stage,
      recommendNextMove(lead),
    ].join('\t');
  });

  return [header.join('\t'), ...rows].join('\n');
}

export type LeadAgentMode = 'research' | 'outreach' | 'qualify';

export function buildLeadAgentBrief(lead: OpsLead, mode: LeadAgentMode) {
  const routes =
    parseContactRoutes(lead.contact_route)
      .map((route) => contactRouteLabels[route])
      .join(', ') || 'Not recorded';
  const nextMove = recommendNextMove(lead);

  const mission =
    mode === 'research'
      ? 'Verify the lead, enrich missing contact routes, and tighten the MedViz fit rationale.'
      : mode === 'outreach'
        ? 'Prepare a reviewed outreach plan and channel-specific drafts using the outreach workflow.'
        : 'Qualify the lead, identify the buying signal, and recommend the founder-approved close path.';

  const deliverable =
    mode === 'research'
      ? 'Return verified contact routes, a stronger fit summary, and the best first channel.'
      : mode === 'outreach'
        ? 'Return one first-touch draft, one follow-up draft, blockers, and the exact approval needed before send.'
        : 'Return the qualification summary, objections, likely pilot angle, and the next founder action.';

  return [
    `Agent mode: ${mode}`,
    `Lead: ${lead.contact_name} at ${lead.account_name}`,
    `Mission: ${mission}`,
    `Current stage: ${lead.stage}`,
    `Why this lead: ${lead.reason_fit ?? 'Not recorded'}`,
    `Contact email: ${lead.contact_email ?? 'Not recorded'}`,
    `Source/profile URL: ${lead.source_url ?? 'Not recorded'}`,
    `Routes: ${routes}`,
    `Recommended next move: ${nextMove}`,
    `Deliverable: ${deliverable}`,
    'Sender convention: use Emmanuel from MedViz for external drafts unless a role-specific sender is more useful.',
    'Use [$app-test-review-outreach](C:/Users/HP/.codex/skills/app-test-review-outreach/SKILL.md) for outreach-safe drafting and review.',
  ].join('\n');
}
