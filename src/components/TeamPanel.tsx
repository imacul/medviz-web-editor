import { useEffect, useState } from 'react';
import { FiCheck, FiCopy, FiExternalLink, FiTrash2, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router';

import {
  listCaseMembers,
  removeCaseMember,
  updateMemberRole,
  type CaseMember,
  type MemberRole,
} from '../features/team';
import { getSupabaseClient } from '../lib/supabase/client';

interface TeamPanelProps {
  caseId: string;
  shareToken: string;
  isOwner: boolean;
  currentUserId: string;
}

export default function TeamPanel({
  caseId,
  shareToken,
  isOwner,
  currentUserId,
}: TeamPanelProps) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<CaseMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/share/${shareToken}`;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    listCaseMembers(caseId)
      .then((data) => {
        if (isMounted) {
          setMembers(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load team.');
          setIsLoading(false);
        }
      });

    const client = getSupabaseClient();
    const channel = client
      .channel(`case_members:${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'case_members', filter: `case_id=eq.${caseId}` },
        (payload) => {
          if (!isMounted) return;
          // If current user was removed, redirect to dashboard
          if (
            payload.eventType === 'DELETE' &&
            (payload.old as Record<string, unknown>)?.user_id === currentUserId
          ) {
            navigate('/dashboard', { replace: true });
            return;
          }
          void listCaseMembers(caseId).then((data) => {
            if (isMounted) setMembers(data);
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void client.removeChannel(channel);
    };
  }, [caseId, currentUserId, navigate]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRemove = async (member: CaseMember) => {
    if (!window.confirm(`Remove ${member.member_email ?? 'this member'} from the case?`)) return;
    await removeCaseMember(member.id);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  };

  const handleRoleChange = async (member: CaseMember, role: MemberRole) => {
    const updated = await updateMemberRole(member.id, role);
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  return (
    <section className="mt-6 rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-gold">
            Team
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-medviz-ink">
            Collaborators {members.length > 0 ? `(${members.length})` : ''}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/60">
            Share this link with your team. Anyone with a MedViz account who opens the link will be
            added as a viewer automatically.
          </p>
        </div>

        {isOwner && (
          <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-medviz-line/60 bg-[rgba(9,22,39,0.6)] px-5 py-4 min-w-[220px]">
            <div className="flex items-center gap-2">
              <FiUsers className="h-4 w-4 shrink-0 text-medviz-gold" />
              <span className="text-xs font-bold uppercase tracking-widest text-medviz-gold">
                Share Case
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-medviz-line bg-[rgba(6,15,26,0.7)] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-white/45">{shareUrl}</span>
            </div>

            <button
              type="button"
              onClick={() => void copyShareLink()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-medviz-gold px-4 py-2 text-sm font-semibold text-[#060f1a] transition hover:bg-[#ffd97a]"
            >
              {copied ? (
                <>
                  <FiCheck className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <FiCopy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </button>

            <div className="border-t border-medviz-line/40 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/35">
                Preview
              </p>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-medviz-line px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-medviz-gold/60 hover:text-medviz-gold"
              >
                <FiExternalLink className="h-4 w-4" />
                Open as Viewer
              </a>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)]"
              />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-white/40">
            No collaborators yet. Share the invite link to add your team.
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-medviz-line/60 bg-[rgba(9,22,39,0.85)] px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-medviz-gold/20 text-xs font-bold text-medviz-gold">
                    {(member.member_email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-medviz-ink">
                      {member.member_email ?? 'Member'}
                      {member.user_id === currentUserId && (
                        <span className="ml-2 text-xs text-white/38">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-white/38">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOwner ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => void handleRoleChange(member, e.target.value as MemberRole)}
                        className="rounded-full border border-medviz-line bg-[rgba(15,39,69,0.9)] px-3 py-1.5 text-xs font-semibold text-medviz-ink outline-none transition hover:border-medviz-gold"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleRemove(member)}
                        className="rounded-full p-1.5 text-white/30 transition hover:bg-rose-500/15 hover:text-rose-400"
                        title="Remove member"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full border border-medviz-line px-3 py-1 text-xs font-semibold text-white/55">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
