# MedViz Agent Swarm Business Playbook

## Goal

Run MedViz as a focused founder-led software business, not as a loose collection of product work and outreach files.

This playbook assumes the current product is MedViz:

- browser-based 3D case review for oral surgery, implant, and related clinical teams
- free self-serve demo at `/demo`
- optional paid pilot / rollout support from the landing page
- private case workspaces with sharing, comments, and saved cases

## What Already Exists

The repo already contains the core pieces of a real business motion:

- Product positioning and pricing on the landing page in `src/LandingPage.jsx`
- Free demo conversion path in `src/pages/DemoPage.tsx`
- Business profile / refund policy in `src/pages/BusinessPolicyPage.tsx`
- Case storage, sharing, comments, and team membership in:
  - `src/features/cases/api.ts`
  - `src/features/comments/api.ts`
  - `src/features/team/api.ts`
  - `src/components/TeamPanel.tsx`
- Dashboard and saved-case workflow in `src/pages/DashboardPage.tsx`
- Event tracking wrapper in `src/lib/analytics.ts`
- Existing outbound sales artifacts in `outreach/`
- Gmail reply monitor and auto-ack scripts in `scripts/gmail_reply_monitor.py` and `scripts/gmail_realtime_responder.py`

This means MedViz is past the idea stage. The business problem is now operating discipline.

## Swarm Design

Use eight agents. Keep one human approval gate: pricing changes, outbound sending, refunds, and roadmap commits should stay human-approved.

### 1. Founder-Operator Agent

Owns:

- weekly revenue target
- pipeline review
- product priority decisions
- pricing and offer packaging
- approval of outbound campaigns and pilot scopes

Inputs:

- demo traffic and CTA events
- reply volume and call volume
- pilot conversion rate
- customer feedback themes

Outputs:

- weekly operating memo
- one growth experiment
- one product priority
- one blocked-risk decision

Primary KPI:

- closed pilots per month

### 2. Demand Gen Agent

Owns:

- ICP definition
- segment expansion
- new lead sourcing
- lead list hygiene

Focus segments:

- oral and maxillofacial surgery clinics
- dental implant and surgical centers
- training programs
- labs collaborating with surgeons

Inputs:

- current buyer messaging from `src/LandingPage.jsx`
- historical lead files in `outreach/`

Outputs:

- ranked lead batches with fit reason, source URL, segment, and next action
- weekly segment report: where replies came from and where they did not

Primary KPI:

- qualified new leads added per week

### 3. Outreach Operator Agent

Owns:

- first-touch email drafts
- follow-up sequencing
- batch preparation
- suppression of duplicates and bounced contacts

Inputs:

- lead batches from Demand Gen
- message frameworks already present in:
  - `outreach/medviz_pilot_sprint_10_day_sequence_2026-03-21.md`
  - `outreach/medviz_review_email_2026-03-18.txt`
  - `outreach/medviz_leads_and_planned_messages_2026-03-25.txt`

Outputs:

- send-ready CSV batches
- daily follow-up queue
- bounce and unsubscribe suppression list

Primary KPI:

- positive reply rate

Guardrail:

- no sending without explicit approval on the current batch

### 4. Reply Triage Agent

Owns:

- inbox monitoring
- reply classification
- first response drafting
- escalation routing

Inputs:

- Gmail monitor scripts in `scripts/`
- reply state files in `outreach/`

Outputs:

- reply labels:
  - interested
  - needs proof
  - not now
  - wrong contact
  - unsubscribe
- suggested next response
- call-booking recommendation

Primary KPI:

- median time to first useful response

Guardrail:

- auto-ack only for safe holding replies; real commercial responses stay human-approved

### 5. Qualification and Closing Agent

Owns:

- discovery prep
- pilot qualification
- objection handling
- scope summary generation

Inputs:

- interested replies
- call notes
- current packaging on the landing page

Outputs:

- call brief before each conversation
- post-call qualification summary
- recommended next step:
  - send pilot scope
  - send demo walkthrough
  - nurture
  - disqualify

Primary KPI:

- call-to-pilot conversion rate

Qualification rule:

- a prospect is qualified only if they have a real workflow pain, a usable team context, and a path to run one de-identified pilot case

### 6. Pilot Delivery and Customer Success Agent

Owns:

- onboarding checklist
- pilot setup progress
- first-case success tracking
- retention and expansion signals

Inputs:

- new pilot commitments
- product capability map from the app
- case activity once customers are onboarded

Outputs:

- pilot kickoff checklist
- success milestones for day 1, day 3, and day 7
- expansion recommendation

Primary KPI:

- first-case success within 7 days

Current product strengths this agent can leverage:

- saved cases
- model upload and editing
- share links
- comments
- collaborators
- report/export workflow

### 7. Product Intelligence Agent

Owns:

- turning feedback into ranked product priorities
- identifying friction in demo-to-signup conversion
- identifying gaps between offer copy and real product behavior

Inputs:

- landing and demo copy
- analytics events
- customer feedback
- support issues

Outputs:

- weekly top-5 friction list
- evidence-backed feature recommendation
- churn-risk notes

Primary KPI:

- number of high-friction issues reduced each month

### 8. Support and Compliance Agent

Owns:

- support inbox organization
- refund and cancellation workflow
- policy consistency
- trust and compliance surface review

Inputs:

- policy page
- support email traffic
- customer complaints or refund requests

Outputs:

- support response drafts
- refund recommendation
- trust-gap checklist

Primary KPI:

- time to resolution

## Handoffs

The swarm only works if the handoffs are explicit:

1. Demand Gen Agent produces ranked leads.
2. Outreach Operator turns leads into approved sends.
3. Reply Triage classifies incoming replies.
4. Qualification and Closing decides whether a call or scope should be sent.
5. Pilot Delivery executes the paid or guided pilot.
6. Product Intelligence converts feedback into roadmap changes.
7. Founder-Operator reviews metrics weekly and reallocates effort.

## Operating Cadence

### Daily

- Demand Gen: source 10 to 20 net-new fit leads
- Outreach Operator: prepare one new batch and one follow-up batch
- Reply Triage: process inbox and classify all new replies
- Qualification and Closing: prep and summarize any active conversations
- Pilot Delivery: review active pilots and blocked accounts
- Product Intelligence: log friction from demo usage, pilots, and support

### Weekly

- review demo traffic, signup conversions, and outreach reply quality
- review pipeline by stage:
  - sourced
  - contacted
  - replied
  - qualified
  - called
  - closed
- choose one growth experiment and one product fix
- publish a short operating memo

## KPI Board

Track these as the minimum viable business dashboard:

- unique demo visitors per week
- demo-to-signup conversion rate
- signup-to-case-created conversion rate
- case-created-to-shared conversion rate
- outbound positive reply rate
- call booking rate
- call-to-pilot close rate
- time to first pilot success
- monthly active teams
- expansion or renewal rate

## What Is Missing

The repo shows real momentum, but the swarm will stall without these missing pieces:

- a single source of truth for pipeline stages
- structured lead / account database instead of file-only outreach history
- structured customer feedback log tied to product actions
- billing and invoice workflow linked to actual pilot stages
- explicit onboarding checklist for paid pilots
- analytics coverage beyond generic CTA events
- support and refund workflow state tracking
- clear distinction between demo-only collaboration simulation and real collaboration in marketing copy

## Highest-Leverage Product Gaps

If the goal is to run MedViz as a business now, these are the next build priorities:

1. Add a simple CRM layer for prospects, pilots, and customer status.
2. Expand analytics to capture:
   - demo import started
   - demo import completed
   - comment added
   - share link copied
   - signup completed
   - case created
   - collaborator joined
3. Create a pilot onboarding record with status, owner, target outcome, and renewal decision.
4. Add a feedback capture surface after the free demo and after pilot milestones.
5. Tighten messaging where the demo simulates collaboration so prospects do not misread it as already persistent in free mode.

## Recommended First 30 Days

If you want this swarm to behave like a business immediately, run this order:

1. Keep the current free-demo plus paid-pilot offer.
2. Use the Demand Gen and Outreach Operator agents to keep a steady weekly pipeline.
3. Use the Reply Triage agent only for classification and safe acknowledgments.
4. Put Qualification and Closing on every positive reply.
5. Deliver one paid pilot end-to-end and document the exact onboarding path.
6. Feed every objection and friction point into Product Intelligence.
7. Build the CRM and analytics gaps before adding more marketing surface area.

## Default Decision Rules

- If a lead is not clearly in the ICP, do not send.
- If a reply is ambiguous, classify it before drafting.
- If a prospect wants proof, send demo/walkthrough before pushing a call.
- If a pilot cannot be tied to one workflow bottleneck, do not scope it yet.
- If the product cannot support a promised behavior today, change the copy before increasing outbound volume.

## Bottom Line

MedViz does not need a giant agent swarm.

It needs a disciplined one:

- one operator agent
- three revenue agents
- one delivery agent
- one product intelligence agent
- one support/compliance agent

That is enough to run this repo like a lean business and expose whether the current motion can reliably turn free case-review interest into paid pilot revenue.
