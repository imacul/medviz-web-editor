import { useEffect, type ReactNode } from 'react';
import { FiActivity, FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiClock, FiLayers, FiLock, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router';

import logoSvg from '../../assets/medviz-logo.svg';
import OpsControlPlane from '../components/OpsControlPlane';
import SiteHeader from '../components/SiteHeader';
import {
  automationBlueprints,
  executionAssets,
  nextBuildPriorities,
  swarmAgentCards,
  swarmApprovalGates,
  swarmDailyCadence,
  swarmKpis,
} from '../content/swarmPlaybook';
import { trackEvent } from '../lib/analytics';

export default function OpsDashboardPage() {
  useEffect(() => {
    document.body.classList.remove('editor-mode');
    document.title = 'MedViz - Swarm Ops';
    trackEvent('ops_dashboard_view', { surface: 'swarm_control_plane' });
  }, []);

  return (
    <div className="min-h-full bg-transparent">
      <SiteHeader
        actions={[
          { label: 'Case List', to: '/dashboard', variant: 'outline' },
          { label: 'Settings', to: '/settings', variant: 'outline' },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-medviz-line/80 bg-[linear-gradient(145deg,rgba(9,22,39,0.98),rgba(15,39,69,0.95))] px-6 py-6 text-white shadow-[0_30px_80px_rgba(3,10,18,0.45)] backdrop-blur lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-medviz-line bg-[rgba(9,22,39,0.9)]">
                <img src={logoSvg} alt="MedViz logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
                  Business Control
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold text-medviz-ink">Swarm Ops</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
                  Run MedViz with a bounded autonomous swarm: agents handle sourcing, drafting,
                  triage, onboarding, and reporting, while pricing, sending, refunds, compliance,
                  and roadmap commitments stay behind human approval gates.
                </p>
                <p className="mt-2 text-sm text-white/56">
                  Default sender convention: use Emmanuel from MedViz for founder outreach, or the
                  agent name plus MedViz for role-specific work such as “Best, Mandel from MedViz.”
                </p>
              </div>
            </div>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.85)] px-5 py-3 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to Case List
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={<FiLayers className="h-5 w-5" />}
              label="Agents"
              value={String(swarmAgentCards.length).padStart(2, '0')}
              detail="Role-specific prompt files and clear handoffs"
            />
            <MetricCard
              icon={<FiLock className="h-5 w-5" />}
              label="Approval Gates"
              value={String(swarmApprovalGates.length).padStart(2, '0')}
              detail="High-risk actions blocked until reviewed"
            />
            <MetricCard
              icon={<FiClock className="h-5 w-5" />}
              label="Automation Runs"
              value={String(automationBlueprints.length).padStart(2, '0')}
              detail="Recurring outreach prep and closeout reporting"
            />
          </div>
        </header>

        <OpsControlPlane />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
            <SectionHeader
              kicker="Swarm Roles"
              title="What each agent can own without supervision"
              description="These roles are wired for bounded autonomy. Each card points at the prompt file that can be handed to a sub-agent or reused in automation."
            />

            <div className="mt-8 grid gap-4 xl:grid-cols-2">
              {swarmAgentCards.map((agent) => (
                <article
                  key={agent.id}
                  className="rounded-[26px] border border-medviz-line/80 bg-[linear-gradient(180deg,rgba(9,22,39,0.94),rgba(15,39,69,0.9))] p-5 shadow-[0_12px_36px_rgba(3,10,18,0.28)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xs font-bold uppercase tracking-[0.32em] text-medviz-accent">
                        {agent.name}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-white/72">{agent.mission}</p>
                    </div>
                    <FiActivity className="mt-1 h-5 w-5 shrink-0 text-medviz-gold" />
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/48">Owns</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/72">
                      {agent.owns.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medviz-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/48">Primary KPI</p>
                    <p className="mt-2 text-sm font-semibold text-medviz-ink">{agent.kpi}</p>
                    <p className="mt-3 text-xs text-white/52">Prompt file: {agent.promptPath}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <Panel
              kicker="Human Gates"
              title="Actions the swarm cannot take alone"
              icon={<FiAlertTriangle className="h-5 w-5 text-amber-300" />}
            >
              <ul className="space-y-3 text-sm leading-6 text-white/72">
                {swarmApprovalGates.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              kicker="Recurring Runs"
              title="Suggested automation schedules"
              icon={<FiClock className="h-5 w-5 text-medviz-accent" />}
            >
              <div className="space-y-4">
                {automationBlueprints.map((automation) => (
                  <div key={automation.name} className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                    <p className="text-sm font-semibold text-medviz-ink">{automation.name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-medviz-gold">
                      {automation.schedule}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/68">{automation.purpose}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel
            kicker="Daily Cadence"
            title="Default operating rhythm"
            icon={<FiCheckCircle className="h-5 w-5 text-emerald-300" />}
          >
            <ul className="space-y-3 text-sm leading-6 text-white/72">
              {swarmDailyCadence.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medviz-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            kicker="Scoreboard"
            title="Metrics the swarm should report"
            icon={<FiTrendingUp className="h-5 w-5 text-medviz-gold" />}
          >
            <ul className="space-y-3 text-sm leading-6 text-white/72">
              {swarmKpis.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-medviz-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel
            kicker="Execution Assets"
            title="What the swarm can already work with"
            icon={<FiLayers className="h-5 w-5 text-medviz-accent" />}
          >
            <div className="space-y-4">
              {executionAssets.map((asset) => (
                <div key={asset.path} className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-semibold text-medviz-ink">{asset.label}</p>
                  <p className="mt-1 font-mono text-xs text-medviz-gold">{asset.path}</p>
                  <p className="mt-2 text-sm leading-6 text-white/68">{asset.note}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            kicker="Next Buildouts"
            title="What to add before calling this self-serve autonomy"
            icon={<FiAlertTriangle className="h-5 w-5 text-amber-300" />}
          >
            <ul className="space-y-3 text-sm leading-6 text-white/72">
              {nextBuildPriorities.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
        {kicker}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">{description}</p>
    </div>
  );
}

function Panel({
  kicker,
  title,
  icon,
  children,
}: {
  kicker: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
            {kicker}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">{title}</h2>
        </div>
        <div className="mt-1 shrink-0">{icon}</div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">{label}</p>
        <div className="text-medviz-accent">{icon}</div>
      </div>
      <div className="mt-3 font-display text-4xl font-bold">{value}</div>
      <p className="mt-2 text-sm leading-6 text-white/72">{detail}</p>
    </div>
  );
}
