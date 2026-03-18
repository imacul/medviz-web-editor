import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCornerDownRight, FiSend, FiTrash2, FiX } from 'react-icons/fi';

import { useAuth } from '../features/auth/AuthProvider';
import {
  addComment,
  deleteComment,
  listComments,
  nestComments,
  type Comment,
} from '../features/comments';
import { getSupabaseClient } from '../lib/supabase/client';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

interface CommentThreadProps {
  caseId: string;
  isOwner: boolean;
}

export default function CommentThread({ caseId, isOwner }: CommentThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // map of email -> clearTimeout handle
  const [typingUsers, setTypingUsers] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingChannelRef = useRef<ReturnType<typeof getSupabaseClient>['channel'] extends (...args: infer A) => infer R ? R : never | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() =>
    listComments(caseId)
      .then((flat) => setComments(nestComments(flat)))
      .catch(() => undefined),
    [caseId]
  );

  // Comments realtime + initial load
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    listComments(caseId)
      .then((flat) => {
        if (isMounted) {
          setComments(nestComments(flat));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load comments.');
          setIsLoading(false);
        }
      });

    const client = getSupabaseClient();
    const channel = client
      .channel(`comments:${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `case_id=eq.${caseId}` },
        () => { if (isMounted) void refresh(); }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void client.removeChannel(channel);
    };
  }, [caseId, refresh]);

  // Typing broadcast channel
  useEffect(() => {
    const client = getSupabaseClient();
    const channel = client.channel(`typing:${caseId}`);

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: { email: string } }) => {
        const email = payload?.email;
        if (!email || email === user?.email) return;

        setTypingUsers((prev) => {
          const next = new Map(prev);
          // Clear previous timeout for this user
          const old = next.get(email);
          if (old) clearTimeout(old);
          // Auto-remove after 3s of no new events
          const handle = setTimeout(() => {
            setTypingUsers((m) => {
              const updated = new Map(m);
              updated.delete(email);
              return updated;
            });
          }, 3000);
          next.set(email, handle);
          return next;
        });
      })
      .subscribe();

    // Store ref so CommentForm can broadcast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typingChannelRef as any).current = channel;

    return () => {
      void client.removeChannel(channel);
    };
  }, [caseId, user?.email]);

  const broadcastTyping = useCallback(() => {
    if (!user?.email) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (typingChannelRef as any).current;
    if (ch) {
      void ch.send({ type: 'broadcast', event: 'typing', payload: { email: user.email } });
    }
  }, [user?.email]);

  const handleAdd = async (content: string, parentId?: string | null) => {
    await addComment({ case_id: caseId, content, parent_id: parentId });
    const flat = await listComments(caseId);
    setComments(nestComments(flat));
    setReplyingTo(null);
  };

  const handleDelete = async (commentId: string) => {
    setComments((prev) =>
      prev
        .filter((c) => c.id !== commentId)
        .map((c) => ({ ...c, replies: c.replies?.filter((r) => r.id !== commentId) ?? [] }))
    );
    try {
      await deleteComment(commentId);
    } catch {
      void refresh();
    }
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0
  );

  const typingEmails = Array.from(typingUsers.keys());
  const typingLabel =
    typingEmails.length === 1
      ? `${typingEmails[0].split('@')[0]} is typing…`
      : typingEmails.length === 2
      ? `${typingEmails[0].split('@')[0]} and ${typingEmails[1].split('@')[0]} are typing…`
      : typingEmails.length > 2
      ? 'Several people are typing…'
      : null;

  return (
    <section className="mt-6 rounded-[34px] border border-medviz-line/80 bg-[rgba(15,39,69,0.88)] px-6 py-7 shadow-[0_24px_70px_rgba(3,10,18,0.4)] backdrop-blur lg:px-8">
      <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-medviz-accent">
        Discussion
      </p>
      <h2 className="mt-3 font-display text-2xl font-bold text-medviz-ink">
        Comments {totalCount > 0 ? `(${totalCount})` : ''}
      </h2>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)]" />
          ))
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/48">No comments yet. Be the first to add a note.</p>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? null}
              isOwner={isOwner}
              replyingTo={replyingTo}
              onReply={() => setReplyingTo(comment.id)}
              onCancelReply={() => setReplyingTo(null)}
              onDelete={handleDelete}
              onAddReply={handleAdd}
              onTyping={broadcastTyping}
            />
          ))
        )}
      </div>

      {/* Typing indicator */}
      {typingLabel && (
        <div className="mt-3 flex items-center gap-2 px-1">
          <TypingDots />
          <span className="text-xs text-white/50 italic">{typingLabel}</span>
        </div>
      )}

      {user && (
        <div className="mt-6 border-t border-medviz-line/60 pt-6">
          <CommentForm
            placeholder="Add a comment…"
            onSubmit={(content) => handleAdd(content, null)}
            onTyping={broadcastTyping}
          />
        </div>
      )}

      <div ref={bottomRef} />
    </section>
  );
}

function TypingDots() {
  return (
    <span className="flex items-end gap-0.75">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white/40"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

interface CommentCardProps {
  comment: Comment;
  currentUserId: string | null;
  isOwner: boolean;
  replyingTo: string | null;
  onReply: () => void;
  onCancelReply: () => void;
  onDelete: (id: string) => Promise<void>;
  onAddReply: (content: string, parentId: string) => Promise<void>;
  onTyping: () => void;
}

function CommentCard({
  comment,
  currentUserId,
  isOwner,
  replyingTo,
  onReply,
  onCancelReply,
  onDelete,
  onAddReply,
  onTyping,
}: CommentCardProps) {
  const canDelete = isOwner || comment.user_id === currentUserId;
  const isReplying = replyingTo === comment.id;

  return (
    <div className="rounded-2xl border border-medviz-line/60 bg-[rgba(9,22,39,0.85)] p-4">
      <CommentBody
        comment={comment}
        canDelete={canDelete}
        onDelete={() => void onDelete(comment.id)}
      />

      {(comment.replies?.length ?? 0) > 0 && (
        <div className="relative ml-3 mt-4 space-y-4 pl-5">
          {/* Thread line */}
          <div className="absolute left-0 top-0 bottom-2 w-px bg-linear-to-b from-medviz-accent/50 via-medviz-accent/25 to-transparent" />
          {/* Top dot */}
          <div className="absolute -left-0.75 top-2 h-1.5 w-1.5 rounded-full bg-medviz-accent/60" />
          {comment.replies!.map((reply, idx) => (
            <div key={reply.id} className="relative">
              {/* Horizontal connector */}
              <div className="absolute -left-5 top-3.5 h-px w-4 bg-medviz-accent/30" />
              {idx > 0 && (
                <div className="absolute -left-5.75 top-3 h-1.5 w-1.5 rounded-full border border-medviz-accent/40 bg-[rgba(9,22,39,0.9)]" />
              )}
              <CommentBody
                comment={reply}
                canDelete={isOwner || reply.user_id === currentUserId}
                onDelete={() => void onDelete(reply.id)}
                isReply
              />
            </div>
          ))}
        </div>
      )}

      {currentUserId && (
        <div className="mt-3">
          {isReplying ? (
            <div className="relative ml-3 pl-5">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-medviz-accent/40" />
              <div className="absolute -left-0.75 top-3 h-1.5 w-1.5 rounded-full bg-medviz-accent/70" />
              <CommentForm
                placeholder="Write a reply…"
                onSubmit={(content) => onAddReply(content, comment.id)}
                onCancel={onCancelReply}
                onTyping={onTyping}
                compact
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onReply}
              className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-medviz-accent"
            >
              <FiCornerDownRight className="h-3.5 w-3.5" />
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentBodyProps {
  comment: Comment;
  canDelete: boolean;
  onDelete: () => void;
  isReply?: boolean;
}

function CommentBody({ comment, canDelete, onDelete, isReply }: CommentBodyProps) {
  return (
    <div className={isReply ? 'pt-0.5' : ''}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-medviz-accent/20 text-xs font-bold text-medviz-accent ring-1 ring-medviz-accent/20">
            {comment.author_email[0].toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-semibold text-medviz-ink">{comment.author_email}</span>
            <span className="ml-2 text-xs text-white/38">
              {dateFormatter.format(new Date(comment.created_at))}
            </span>
          </div>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-1.5 text-white/30 transition hover:bg-rose-500/15 hover:text-rose-400"
            title="Delete comment"
          >
            <FiTrash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-white/75">{comment.content}</p>
    </div>
  );
}

interface CommentFormProps {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  onTyping?: () => void;
  compact?: boolean;
}

function CommentForm({ placeholder, onSubmit, onCancel, onTyping, compact }: CommentFormProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onTyping?.();
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        disabled={isSubmitting}
        className="w-full rounded-2xl border border-medviz-line bg-[rgba(9,22,39,0.85)] px-4 py-3 text-sm leading-6 text-medviz-ink outline-none transition placeholder:text-white/28 focus:border-medviz-accent disabled:opacity-60"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            void handleSubmit();
          }
        }}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!value.trim() || isSubmitting}
          className="inline-flex items-center gap-2 rounded-full bg-medviz-accent px-4 py-2 text-sm font-semibold text-[#060f1a] transition hover:bg-[#7ad9ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSend className="h-3.5 w-3.5" />
          {isSubmitting ? 'Posting…' : 'Post'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-full border border-medviz-line px-4 py-2 text-sm font-semibold text-white/60 transition hover:text-white"
          >
            <FiX className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
