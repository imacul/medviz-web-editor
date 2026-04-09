import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  FiCopy,
  FiDatabase,
  FiDownload,
  FiMail,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiUpload,
  FiZap,
} from 'react-icons/fi';

import {
  buildChannelPrep,
  buildExecutionQueueTsv,
  buildLeadAgentBrief,
  buildOutreachExportCsv,
  contactRouteLabels,
  dedupeImportedLeads,
  deriveLeadFromBatchRow,
  parseContactRoutes,
  recommendNextMove,
  scoreLeadFit,
  stringifyContactRoutes,
  type LeadAgentMode,
} from '../features/ops/intelligence';
import {
  createOpsLead,
  createOpsLeadsBulk,
  deleteOpsLead,
  listOpsLeads,
  listOutreachBatchFiles,
  OPS_CONTACT_ROUTE_IDS,
  OPS_LEAD_STAGES,
  updateOpsLead,
  type OpsContactRouteId,
  type OpsLead,
  type OpsLeadStage,
  type OutreachBatchFile,
} from '../features/ops';

type OutreachFileSummary = {
  fileName: string;
  modifiedAt: string;
  sizeBytes: number;
};

type OutreachState = {
  generatedAt: string;
  sendLogs: Array<{
    fileName: string;
    sentCount: number;
    lastSentAt: string | null;
    subjects: string[];
  }>;
  replyMonitor: { seenCount: number; lastSeenId: string | null };
  realtimeResponder: { seenCount?: number; repliedCount: number; lastRepliedId: string | null };
  uniqueRecipientsCount: number;
  recentBatchFiles: OutreachFileSummary[];
};

type LeadDraft = {
  stage: OpsLeadStage;
  nextAction: string;
  routes: OpsContactRouteId[];
  reasonFit: string;
};

const stageLabels: Record<OpsLeadStage, string> = {
  sourced: 'Sourced',
  contacted: 'Contacted',
  replied: 'Replied',
  qualified: 'Qualified',
  pilot: 'Pilot',
  won: 'Won',
  lost: 'Lost',
};

const createDraft = (lead: OpsLead): LeadDraft => ({
  stage: lead.stage,
  nextAction: lead.next_action ?? '',
  routes: parseContactRoutes(lead.contact_route),
  reasonFit: lead.reason_fit ?? '',
});

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not yet';

function SectionCard({
  title,
  kicker,
  children,
  action,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">{kicker}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-medviz-ink">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function OpsControlPlane() {
  const [leads, setLeads] = useState<OpsLead[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LeadDraft>>({});
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadNotice, setLeadNotice] = useState<string | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [copiedPrepKey, setCopiedPrepKey] = useState<string | null>(null);
  const [copiedSpawnKey, setCopiedSpawnKey] = useState<string | null>(null);
  const [copiedExportKey, setCopiedExportKey] = useState<string | null>(null);
  const [outreachState, setOutreachState] = useState<OutreachState | null>(null);
  const [outreachError, setOutreachError] = useState<string | null>(null);
  const [isLoadingOutreach, setIsLoadingOutreach] = useState(true);
  const [batchFiles, setBatchFiles] = useState<OutreachBatchFile[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [importingBatchName, setImportingBatchName] = useState<string | null>(null);
  const [form, setForm] = useState({
    accountName: '',
    contactName: '',
    reasonFit: '',
    contactEmail: '',
    segment: 'oral surgery clinic',
    sourceUrl: '',
    nextAction: '',
    notes: '',
    routes: ['email'] as OpsContactRouteId[],
  });

  const loadLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const records = await listOpsLeads();
      setLeads(records);
      setDrafts(
        records.reduce<Record<string, LeadDraft>>((accumulator, lead) => {
          accumulator[lead.id] = createDraft(lead);
          return accumulator;
        }, {})
      );
      setLeadError(null);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Failed to load ops leads.');
    } finally {
      setIsLoadingLeads(false);
    }
  }, []);

  const loadOutreachState = useCallback(async () => {
    setIsLoadingOutreach(true);
    try {
      const response = await fetch('/api/ops/outreach-state');
      const payload = (await response.json()) as { ok: boolean; error?: string } & Partial<OutreachState>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to load outreach state.');
      }
      setOutreachState({
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
        sendLogs: payload.sendLogs ?? [],
        replyMonitor: payload.replyMonitor ?? { seenCount: 0, lastSeenId: null },
        realtimeResponder: payload.realtimeResponder ?? {
          seenCount: 0,
          repliedCount: 0,
          lastRepliedId: null,
        },
        uniqueRecipientsCount: payload.uniqueRecipientsCount ?? 0,
        recentBatchFiles: payload.recentBatchFiles ?? [],
      });
      setOutreachError(null);
    } catch (error) {
      setOutreachError(error instanceof Error ? error.message : 'Failed to load outreach state.');
    } finally {
      setIsLoadingOutreach(false);
    }
  }, []);

  const loadBatchFiles = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const records = await listOutreachBatchFiles();
      setBatchFiles(records);
      setBatchError(null);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : 'Failed to load outreach batches.');
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
    void loadOutreachState();
    void loadBatchFiles();
  }, [loadBatchFiles, loadLeads, loadOutreachState]);

  const previewLeads = useMemo(
    () =>
      leads.map((lead) => {
        const draft = drafts[lead.id] ?? createDraft(lead);
        const routes = draft.routes.length > 0 ? draft.routes : parseContactRoutes(lead.contact_route);
        return {
          ...lead,
          stage: draft.stage,
          next_action: draft.nextAction || null,
          contact_route: stringifyContactRoutes(routes),
          reason_fit: draft.reasonFit || null,
        };
      }),
    [drafts, leads]
  );

  const groupedLeads = useMemo(
    () =>
      OPS_LEAD_STAGES.map((stage) => ({
        stage,
        label: stageLabels[stage],
        leads: previewLeads.filter((lead) => lead.stage === stage),
      })),
    [previewLeads]
  );

  const exportableLeads = useMemo(
    () => previewLeads.filter((lead) => lead.stage !== 'won' && lead.stage !== 'lost'),
    [previewLeads]
  );

  const batchSummaries = useMemo(
    () =>
      batchFiles.map((batch) => {
        const candidates = batch.rows
          .map((row) => deriveLeadFromBatchRow(row, batch.fileName))
          .filter((value): value is NonNullable<typeof value> => Boolean(value));
        const importable = dedupeImportedLeads(candidates, leads);

        return {
          ...batch,
          importable,
          sample: importable.slice(0, 2),
        };
      }),
    [batchFiles, leads]
  );

  const resetCopyState = (
    setter: Dispatch<SetStateAction<string | null>>,
    key: string
  ) => {
    setter(key);
    window.setTimeout(() => {
      setter((current) => (current === key ? null : current));
    }, 1500);
  };

  const handleCreateLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingLead(true);
    setLeadNotice(null);
    try {
      const createdLead = await createOpsLead({
        account_name: form.accountName,
        contact_name: form.contactName,
        reason_fit: form.reasonFit || null,
        contact_email: form.contactEmail || null,
        contact_route: stringifyContactRoutes(form.routes),
        segment: form.segment || null,
        source_url: form.sourceUrl || null,
        next_action: form.nextAction || null,
        notes: form.notes || null,
      });
      setLeads((current) => [createdLead, ...current]);
      setDrafts((current) => ({ ...current, [createdLead.id]: createDraft(createdLead) }));
      setForm({
        accountName: '',
        contactName: '',
        reasonFit: '',
        contactEmail: '',
        segment: 'oral surgery clinic',
        sourceUrl: '',
        nextAction: '',
        notes: '',
        routes: ['email'],
      });
      setLeadError(null);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Failed to create ops lead.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  const updateDraft = (leadId: string, updater: (current: LeadDraft) => LeadDraft) => {
    setDrafts((current) => ({
      ...current,
      [leadId]: updater(current[leadId] ?? { stage: 'sourced', nextAction: '', routes: [], reasonFit: '' }),
    }));
  };

  const handleSaveLead = async (lead: OpsLead) => {
    const draft = drafts[lead.id];
    if (!draft) return;

    setUpdatingLeadId(lead.id);
    setLeadNotice(null);
    try {
      const updatedLead = await updateOpsLead(lead.id, {
        stage: draft.stage,
        next_action: draft.nextAction || null,
        contact_route: stringifyContactRoutes(draft.routes),
        reason_fit: draft.reasonFit || null,
      });
      setLeads((current) => current.map((item) => (item.id === lead.id ? updatedLead : item)));
      setDrafts((current) => ({ ...current, [lead.id]: createDraft(updatedLead) }));
      setLeadError(null);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Failed to update ops lead.');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleStampLead = async (lead: OpsLead, field: 'last_outreach_at' | 'last_reply_at') => {
    setUpdatingLeadId(lead.id);
    setLeadNotice(null);
    try {
      const updatedLead = await updateOpsLead(lead.id, { [field]: new Date().toISOString() });
      setLeads((current) => current.map((item) => (item.id === lead.id ? updatedLead : item)));
      setDrafts((current) => ({ ...current, [lead.id]: createDraft(updatedLead) }));
      setLeadError(null);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Failed to update lead activity.');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleDeleteLead = async (lead: OpsLead) => {
    const confirmed = window.confirm(`Delete ${lead.contact_name} from the MedViz lead CRM?`);
    if (!confirmed) return;

    setDeletingLeadId(lead.id);
    setLeadNotice(null);
    try {
      await deleteOpsLead(lead.id);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setLeadError(null);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Failed to delete ops lead.');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleCopyPrep = async (lead: OpsLead, channel: OpsContactRouteId) => {
    const key = `${lead.id}:${channel}`;
    try {
      await navigator.clipboard.writeText(buildChannelPrep(lead, channel));
      resetCopyState(setCopiedPrepKey, key);
    } catch {
      setLeadError('Could not copy the outreach prep to the clipboard.');
    }
  };

  const handleCopySpawnBrief = async (lead: OpsLead, mode: LeadAgentMode) => {
    const key = `${lead.id}:${mode}`;
    try {
      await navigator.clipboard.writeText(buildLeadAgentBrief(lead, mode));
      resetCopyState(setCopiedSpawnKey, key);
    } catch {
      setLeadError('Could not copy the lead agent brief.');
    }
  };

  const handleCopyExport = async (mode: 'csv' | 'queue') => {
    if (exportableLeads.length === 0) {
      setLeadError('Add or import active leads before exporting the execution queue.');
      return;
    }

    try {
      const value =
        mode === 'csv' ? buildOutreachExportCsv(exportableLeads) : buildExecutionQueueTsv(exportableLeads);
      await navigator.clipboard.writeText(value);
      resetCopyState(setCopiedExportKey, mode);
    } catch {
      setLeadError('Could not copy the export.');
    }
  };

  const handleImportBatch = async (batch: (typeof batchSummaries)[number]) => {
    setImportingBatchName(batch.fileName);
    setLeadNotice(null);
    try {
      if (batch.importable.length === 0) {
        setLeadNotice(`No net-new leads found in ${batch.fileName}.`);
        return;
      }

      const createdLeads = await createOpsLeadsBulk(batch.importable);
      setLeads((current) => [...createdLeads, ...current]);
      setDrafts((current) => ({
        ...current,
        ...createdLeads.reduce<Record<string, LeadDraft>>((accumulator, lead) => {
          accumulator[lead.id] = createDraft(lead);
          return accumulator;
        }, {}),
      }));
      setLeadError(null);
      setLeadNotice(`Imported ${createdLeads.length} lead(s) from ${batch.fileName}.`);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Failed to import outreach batch.');
    } finally {
      setImportingBatchName(null);
    }
  };

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard
        kicker="Lead CRM"
        title="Persistent MedViz pipeline with verification"
        action={
          <button
            type="button"
            onClick={() => {
              void loadLeads();
              void loadOutreachState();
              void loadBatchFiles();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
          >
            <FiRefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
                Import from outreach batches
              </p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Pull recent Gmail or LinkedIn CSV batches from the repository into the MedViz CRM without retyping leads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadBatchFiles()}
              className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
            >
              <FiUpload className="h-4 w-4" />
              Reload Batches
            </button>
          </div>

          {batchError ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-100/8 px-4 py-3 text-sm text-amber-100">
              {batchError}
            </div>
          ) : isLoadingBatches ? (
            <div className="rounded-2xl border border-dashed border-medviz-line/70 px-4 py-4 text-sm text-white/54">
              Loading outreach batch files...
            </div>
          ) : batchSummaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-medviz-line/70 px-4 py-4 text-sm text-white/54">
              No outreach batches were found in the repository.
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {batchSummaries.map((batch) => (
                <article
                  key={batch.fileName}
                  className="rounded-[20px] border border-medviz-line/70 bg-[rgba(9,22,39,0.72)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-medviz-ink">{batch.fileName}</p>
                      <p className="mt-1 text-xs text-white/52">
                        {batch.rowCount} row(s) | {Math.max(1, Math.round(batch.sizeBytes / 1024))} KB |{' '}
                        {formatDateTime(batch.modifiedAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(79,174,255,0.12)] px-2.5 py-1 text-xs font-semibold text-medviz-accent">
                      {batch.importable.length} new
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-white/68">
                    {batch.sample.length > 0 ? (
                      batch.sample.map((lead) => (
                        <div
                          key={`${batch.fileName}:${lead.contact_email}:${lead.account_name}`}
                          className="rounded-[14px] border border-white/8 bg-white/6 px-3 py-2"
                        >
                          <p className="font-semibold text-medviz-ink">{lead.contact_name}</p>
                          <p className="text-xs text-white/54">{lead.account_name}</p>
                          <p className="mt-1 text-xs text-white/54">{lead.contact_email}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-white/54">
                        Everything in this batch already exists in the CRM.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleImportBatch(batch)}
                    disabled={importingBatchName === batch.fileName}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-medviz-accent px-4 py-2 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiUpload className="h-4 w-4" />
                    {importingBatchName === batch.fileName ? 'Importing...' : `Import ${batch.importable.length} lead(s)`}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleCreateLead} className="mt-4 grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.accountName}
              onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value }))}
              className="rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
              placeholder="Account name"
              required
            />
            <input
              value={form.contactName}
              onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
              className="rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
              placeholder="Contact name"
              required
            />
          </div>

          <textarea
            value={form.reasonFit}
            onChange={(event) => setForm((current) => ({ ...current, reasonFit: event.target.value }))}
            className="min-h-[84px] rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
            placeholder="Why this lead fits MedViz"
          />

          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={form.contactEmail}
              onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
              className="rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
              placeholder="Email"
            />
            <input
              value={form.segment}
              onChange={(event) => setForm((current) => ({ ...current, segment: event.target.value }))}
              className="rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
              placeholder="Segment"
            />
            <input
              value={form.sourceUrl}
              onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
              className="rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
              placeholder="Profile or website URL"
            />
          </div>

          <input
            value={form.nextAction}
            onChange={(event) => setForm((current) => ({ ...current, nextAction: event.target.value }))}
            className="rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
            placeholder="Next action"
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className="min-h-[96px] rounded-2xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-4 py-3 text-white outline-none transition focus:border-medviz-accent"
            placeholder="Verification notes, handle, phone number, or referral context"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">Contact routes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPS_CONTACT_ROUTE_IDS.map((route) => {
                const active = form.routes.includes(route);
                return (
                  <button
                    key={route}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        routes: active
                          ? current.routes.filter((item) => item !== route)
                          : [...current.routes, route],
                      }))
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'border-medviz-accent bg-[rgba(79,174,255,0.12)] text-medviz-accent'
                        : 'border-medviz-line/70 bg-[rgba(9,22,39,0.9)] text-white/64 hover:border-medviz-line'
                    }`}
                  >
                    {contactRouteLabels[route]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-white/48">
              Use Emmanuel from MedViz by default. If a role-specific sender helps, use the agent name plus MedViz.
            </p>
            <button
              type="submit"
              disabled={isCreatingLead}
              className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-5 py-3 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSave className="h-4 w-4" />
              {isCreatingLead ? 'Saving...' : 'Add Lead'}
            </button>
          </div>
        </form>

        {leadError ? (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-100/8 px-4 py-3 text-sm text-amber-100">
            {leadError}
          </div>
        ) : null}
        {leadNotice ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-100/8 px-4 py-3 text-sm text-emerald-100">
            {leadNotice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {groupedLeads.map((group) => (
            <div key={group.stage} className="rounded-[24px] border border-white/10 bg-[rgba(9,22,39,0.72)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-medviz-ink">{group.label}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">{group.leads.length} lead(s)</p>
                </div>
                <span className="rounded-full border border-medviz-line/70 bg-[rgba(3,10,18,0.7)] px-3 py-1 text-xs font-semibold text-medviz-gold">
                  {group.stage}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {isLoadingLeads && group.leads.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-medviz-line/70 px-4 py-4 text-sm text-white/54">Loading leads...</div>
                ) : group.leads.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-medviz-line/70 px-4 py-4 text-sm text-white/54">No leads in this stage yet.</div>
                ) : (
                  group.leads.map((lead) => {
                    const draft = drafts[lead.id] ?? createDraft(lead);
                    const routes = draft.routes.length > 0 ? draft.routes : parseContactRoutes(lead.contact_route);
                    const previewLead: OpsLead = {
                      ...lead,
                      stage: draft.stage,
                      next_action: draft.nextAction || null,
                      contact_route: stringifyContactRoutes(routes),
                      reason_fit: draft.reasonFit || null,
                    };
                    const score = scoreLeadFit(previewLead);

                    return (
                      <article key={lead.id} className="rounded-[20px] border border-medviz-line/70 bg-[linear-gradient(180deg,rgba(9,22,39,0.94),rgba(15,39,69,0.9))] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-medviz-ink">{lead.contact_name}</p>
                            <p className="text-sm text-white/62">{lead.account_name}</p>
                            {lead.contact_email ? <p className="mt-1 text-xs text-white/52">{lead.contact_email}</p> : null}
                            {lead.source_url ? <p className="mt-1 text-xs text-white/52">{lead.source_url}</p> : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteLead(lead)}
                            disabled={deletingLeadId === lead.id}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-[rgba(127,29,29,0.18)] px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-[rgba(127,29,29,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                            {deletingLeadId === lead.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[rgba(79,174,255,0.12)] px-2.5 py-1 text-xs font-semibold text-medviz-accent">
                            {score.total}/100
                          </span>
                          <span className="text-xs text-white/54">{score.label}</span>
                          {lead.segment ? <span className="text-xs text-white/54">Segment: {lead.segment}</span> : null}
                          {routes.length > 0 ? (
                            <span className="text-xs text-white/54">
                              Routes: {routes.map((route) => contactRouteLabels[route]).join(', ')}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-3 text-sm leading-6 text-white/68">{recommendNextMove(previewLead)}</p>
                        <div className="mt-3 rounded-[16px] border border-white/8 bg-white/6 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/48">Why this lead</p>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            {draft.reasonFit || lead.reason_fit || 'Add a fit reason so the swarm can justify outreach and qualification.'}
                          </p>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <select
                            value={draft.stage}
                            onChange={(event) =>
                              updateDraft(lead.id, (current) => ({
                                ...current,
                                stage: event.target.value as OpsLeadStage,
                              }))
                            }
                            className="rounded-xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-3 py-2 text-sm text-white outline-none transition focus:border-medviz-accent"
                          >
                            {OPS_LEAD_STAGES.map((stage) => (
                              <option key={stage} value={stage}>
                                {stageLabels[stage]}
                              </option>
                            ))}
                          </select>

                          <input
                            value={draft.nextAction}
                            onChange={(event) =>
                              updateDraft(lead.id, (current) => ({
                                ...current,
                                nextAction: event.target.value,
                              }))
                            }
                            className="rounded-xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-3 py-2 text-sm text-white outline-none transition focus:border-medviz-accent"
                            placeholder="Next action"
                          />

                          <textarea
                            value={draft.reasonFit}
                            onChange={(event) =>
                              updateDraft(lead.id, (current) => ({
                                ...current,
                                reasonFit: event.target.value,
                              }))
                            }
                            className="min-h-[84px] rounded-xl border border-medviz-line/70 bg-[rgba(3,10,18,0.78)] px-3 py-2 text-sm text-white outline-none transition focus:border-medviz-accent"
                            placeholder="Why this lead fits MedViz"
                          />

                          <div className="flex flex-wrap gap-2">
                            {OPS_CONTACT_ROUTE_IDS.map((route) => {
                              const active = draft.routes.includes(route);
                              return (
                                <button
                                  key={route}
                                  type="button"
                                  onClick={() =>
                                    updateDraft(lead.id, (current) => ({
                                      ...current,
                                      routes: active
                                        ? current.routes.filter((item) => item !== route)
                                        : [...current.routes, route],
                                    }))
                                  }
                                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                    active
                                      ? 'border-medviz-accent bg-[rgba(79,174,255,0.12)] text-medviz-accent'
                                      : 'border-medviz-line/70 bg-[rgba(9,22,39,0.9)] text-white/64 hover:border-medviz-line'
                                  }`}
                                >
                                  {contactRouteLabels[route]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveLead(lead)}
                            disabled={updatingLeadId === lead.id}
                            className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-4 py-2 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiSave className="h-4 w-4" />
                            {updatingLeadId === lead.id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStampLead(lead, 'last_outreach_at')}
                            disabled={updatingLeadId === lead.id}
                            className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                          >
                            <FiMail className="h-4 w-4" />
                            Outreach sent
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStampLead(lead, 'last_reply_at')}
                            disabled={updatingLeadId === lead.id}
                            className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-gold hover:text-medviz-gold"
                          >
                            Reply received
                          </button>
                        </div>

                        <div className="mt-4 rounded-[18px] border border-white/10 bg-white/6 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">Prepare outreach by channel</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(routes.length > 0 ? routes : (['email'] as OpsContactRouteId[])).map((route) => {
                              const prepKey = `${lead.id}:${route}`;
                              return (
                                <button
                                  key={route}
                                  type="button"
                                    onClick={() => void handleCopyPrep(previewLead, route)}
                                  className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-3 py-2 text-xs font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                                >
                                  <FiCopy className="h-3.5 w-3.5" />
                                  {copiedPrepKey === prepKey ? 'Copied' : `Prep ${contactRouteLabels[route]}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-4 rounded-[18px] border border-white/10 bg-white/6 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">Spawn agent brief</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {([
                              ['research', 'Research'],
                              ['outreach', 'Outreach'],
                              ['qualify', 'Qualify'],
                            ] as Array<[LeadAgentMode, string]>).map(([mode, label]) => {
                              const spawnKey = `${lead.id}:${mode}`;
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => void handleCopySpawnBrief(previewLead, mode)}
                                  className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-3 py-2 text-xs font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
                                >
                                  <FiZap className="h-3.5 w-3.5" />
                                  {copiedSpawnKey === spawnKey ? 'Copied' : label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-white/48">
                            Copies a lead-specific prompt you can hand to a new swarm sub-agent.
                          </p>
                        </div>

                        <div className="mt-3 text-xs text-white/48">
                          Last outreach: {formatDateTime(lead.last_outreach_at)} | Last reply: {formatDateTime(lead.last_reply_at)}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        kicker="Outreach Engine"
        title="Imports, execution exports, and live repo state"
        action={<FiDatabase className="mt-1 h-5 w-5 text-medviz-accent" />}
      >
        <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
          <p className="text-sm font-semibold text-medviz-ink">Execution exports</p>
          <p className="mt-2 text-sm leading-6 text-white/68">
            Copy an execution-ready export with who to contact, why they fit, contact info, routes, and the next move.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyExport('csv')}
              className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-accent hover:text-medviz-accent"
            >
              <FiDownload className="h-4 w-4" />
              {copiedExportKey === 'csv' ? 'Copied CSV' : `Copy outreach CSV (${exportableLeads.length})`}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyExport('queue')}
              className="inline-flex items-center gap-2 rounded-full border border-medviz-line bg-[rgba(9,22,39,0.9)] px-4 py-2 text-sm font-semibold text-medviz-ink transition hover:border-medviz-gold hover:text-medviz-gold"
            >
              <FiCopy className="h-4 w-4" />
              {copiedExportKey === 'queue' ? 'Copied Queue' : 'Copy execution queue'}
            </button>
          </div>
        </div>

        <div className="mt-4">
          {outreachError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-100/8 px-4 py-3 text-sm text-rose-100">
              {outreachError}
            </div>
          ) : isLoadingOutreach || !outreachState ? (
            <div className="rounded-2xl border border-dashed border-medviz-line/70 px-4 py-4 text-sm text-white/54">
              Loading outreach state...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric label="Unique Recipients" value={String(outreachState.uniqueRecipientsCount)} detail="Distinct addresses in send history" />
                <MiniMetric label="Reply Monitor Seen" value={String(outreachState.replyMonitor.seenCount)} detail={outreachState.replyMonitor.lastSeenId ?? 'No reply IDs yet'} />
                <MiniMetric label="Realtime Replies" value={String(outreachState.realtimeResponder.repliedCount)} detail={outreachState.realtimeResponder.lastRepliedId ?? 'No reply IDs yet'} />
                <MiniMetric label="Recent Batches" value={String(outreachState.recentBatchFiles.length)} detail={`Generated ${formatDateTime(outreachState.generatedAt)}`} />
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-semibold text-medviz-ink">Recent send logs</p>
                <div className="mt-3 space-y-3">
                  {outreachState.sendLogs.map((log) => (
                    <div key={log.fileName} className="rounded-[18px] border border-white/8 bg-[rgba(3,10,18,0.45)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-medviz-ink">{log.fileName}</p>
                          <p className="mt-1 text-xs text-white/52">{formatDateTime(log.lastSentAt)}</p>
                          {log.subjects[0] ? <p className="mt-2 text-sm text-white/68">{log.subjects[0]}</p> : null}
                        </div>
                        <span className="rounded-full bg-medviz-accent px-2.5 py-1 text-xs font-bold text-[#060f1a]">{log.sentCount} sent</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-semibold text-medviz-ink">Recent batch files</p>
                <div className="mt-3 space-y-3">
                  {outreachState.recentBatchFiles.map((file) => (
                    <div key={file.fileName} className="rounded-[18px] border border-white/8 bg-[rgba(3,10,18,0.45)] p-3">
                      <p className="text-sm font-semibold text-medviz-ink">{file.fileName}</p>
                      <p className="mt-1 text-xs text-white/52">
                        {formatDateTime(file.modifiedAt)} | {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-medviz-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/54">{detail}</p>
    </div>
  );
}
