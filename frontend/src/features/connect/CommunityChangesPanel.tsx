import { useState, useEffect, useCallback } from 'react';
import { db, PendingSubmission } from '../../lib/database';
import { Check, X, ChevronDown, ChevronRight, Shield } from 'lucide-react';

interface Props {
  isVisible: boolean;
  onRefresh: () => void;
}

type Tab = 'pending' | 'history';

export default function CommunityChangesPanel({ isVisible, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [history, setHistory] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pendingRes, historyRes] = await Promise.all([
      db.directory.getPendingSubmissions(),
      db.directory.getReviewedSubmissions(),
    ]);
    setPending(pendingRes.data || []);
    setHistory(historyRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isVisible) fetchAll();
  }, [isVisible, fetchAll]);

  const handleApprove = useCallback(async (taskId: string) => {
    // Find reviewer from shop.submitted_by — but we need current user
    // Parent passes userId via onRefresh, we just trigger and refresh
    setPending((prev) => prev.filter((s) => s.id !== taskId));
    setHistory((prev) => prev.map((s) => s.id === taskId ? { ...s, status: 'approved' } : s));
    onRefresh();
  }, [onRefresh]);

  const handleReject = useCallback(async (taskId: string) => {
    setPending((prev) => prev.filter((s) => s.id !== taskId));
    setHistory((prev) => prev.map((s) => s.id === taskId ? { ...s, status: 'rejected' } : s));
    onRefresh();
  }, [onRefresh]);

  if (!isVisible) return null;

  const items = tab === 'pending' ? pending : history;

  return (
    <div className="border-t border-divider bg-canvas">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-ink">Community Changes</h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-md p-0.5">
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 text-xs font-medium py-1.5 rounded transition-colors ${
              tab === 'pending' ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
            }`}
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 text-xs font-medium py-1.5 rounded transition-colors ${
              tab === 'history' ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
            }`}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-4 max-h-64 overflow-y-auto">
        {loading && (
          <p className="text-xs text-muted py-3 text-center">Loading…</p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-xs text-muted py-3 text-center">
            {tab === 'pending' ? 'No pending submissions' : 'No review history'}
          </p>
        )}

        {items.map((item) => {
          const shop = item.shop;
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="border border-divider rounded-md mb-2 bg-surface"
            >
              {/* Row header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-canvas transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="h-3 w-3 text-muted shrink-0" />
                  : <ChevronRight className="h-3 w-3 text-muted shrink-0" />
                }
                <span className="text-sm font-medium text-ink truncate flex-1">
                  {shop?.name || 'Unknown location'}
                </span>
                <StatusBadge status={item.status} />
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-divider">
                  <div className="py-2 space-y-1">
                    {shop?.address && (
                      <p className="text-xs text-muted">{shop.address}</p>
                    )}
                    {shop?.types && (
                      <p className="text-xs text-muted">
                        Types: {shop.types.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      Submitted: {new Date(item.submitted_at).toLocaleDateString()}
                    </p>
                    {item.reviewed_at && (
                      <p className="text-xs text-muted">
                        Reviewed: {new Date(item.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted italic">Note: {item.notes}</p>
                    )}
                  </div>

                  {/* Actions for pending */}
                  {tab === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <ApproveButton taskId={item.id} onApproved={handleApprove} />
                      <RejectButton taskId={item.id} onRejected={handleReject} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'approved' ? 'bg-green-100 text-green-700'
    : status === 'rejected' ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}

function ApproveButton({ taskId, onApproved }: { taskId: string; onApproved: (id: string) => void }) {
  const [working, setWorking] = useState(false);

  const handleClick = useCallback(async () => {
    setWorking(true);
    // We need the reviewer's userId — get from auth context would be ideal,
    // but we can pass it via a closure. For now, use window.__revUserId set by parent.
    // Actually: use a simpler approach — call approveSubmission which needs reviewerId.
    // Parent should handle this. Let's emit via callback and let parent do the DB call.
    // Simplest: import useAuth here.
    try {
      // Lazy import to avoid circular deps
      const { supabase } = await import('../../lib/supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await db.directory.approveSubmission(taskId, user.id);
      onApproved(taskId);
    } finally {
      setWorking(false);
    }
  }, [taskId, onApproved]);

  return (
    <button
      onClick={handleClick}
      disabled={working}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      <Check className="h-3 w-3" />
      {working ? '…' : 'Approve'}
    </button>
  );
}

function RejectButton({ taskId, onRejected }: { taskId: string; onRejected: (id: string) => void }) {
  const [working, setWorking] = useState(false);

  const handleClick = useCallback(async () => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return; // cancelled
    setWorking(true);
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await db.directory.rejectSubmission(taskId, user.id, reason || 'Rejected from map view');
      onRejected(taskId);
    } finally {
      setWorking(false);
    }
  }, [taskId, onRejected]);

  return (
    <button
      onClick={handleClick}
      disabled={working}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
    >
      <X className="h-3 w-3" />
      {working ? '…' : 'Reject'}
    </button>
  );
}
