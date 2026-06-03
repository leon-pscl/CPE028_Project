import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminReview } from '../../hooks/useAdminReview';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export default function AdminReviewPage() {
  const { user } = useAuth();
  const { pendingSubmissions, isLoading, approve, reject, refresh } = useAdminReview();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async (taskId: string) => {
    if (!user) return;
    setActionLoading(taskId);
    setActionError(null);
    const err = await approve(taskId, user.id);
    if (err) setActionError(err);
    setActionLoading(null);
  };

  const handleReject = async (taskId: string) => {
    if (!user) return;
    setActionLoading(taskId);
    setActionError(null);
    const err = await reject(taskId, user.id, rejectNotes);
    if (err) setActionError(err);
    setActionLoading(null);
    setRejectingId(null);
    setRejectNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Review Submissions</h1>
          <p className="text-sm text-muted mt-1">
            Approve or reject user-submitted repair shops and recycling centers.
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 text-sm border border-ink/20 rounded-md text-ink hover:bg-canvas"
        >
          Refresh
        </button>
      </div>

      {actionError && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : pendingSubmissions.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 mx-auto mb-3 text-muted" />
          <p className="text-sm text-muted">No pending submissions to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-surface border border-ink/10 rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink text-base">
                    {sub.shop?.name || 'Unknown'}
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    {sub.shop?.address || 'No address'}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-ink/5 rounded-full">
                      {sub.shop?.type === 'recycling' ? '♻️ Recycle' : '🔧 Repair'}
                    </span>
                    <span>Submitted {new Date(sub.submitted_at).toLocaleDateString()}</span>
                    <span>by {sub.submitted_by ? `User ${sub.submitted_by.slice(0, 8)}…` : 'Unknown'}</span>
                  </div>

                  {sub.shop?.phone && (
                    <p className="text-xs text-muted mt-1">📞 {sub.shop.phone}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rejectingId === sub.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        placeholder="Reason for rejection…"
                        className="w-48 px-2 py-1 text-xs border border-ink/20 rounded"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReject(sub.id)}
                          disabled={actionLoading === sub.id || !rejectNotes.trim()}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded-md disabled:opacity-50"
                        >
                          {actionLoading === sub.id ? '…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                          className="px-3 py-1 text-xs border border-ink/20 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setRejectingId(sub.id)}
                        disabled={actionLoading === sub.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleApprove(sub.id)}
                        disabled={actionLoading === sub.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                        title="Approve"
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
