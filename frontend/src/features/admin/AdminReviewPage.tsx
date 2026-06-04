import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminReview } from '../../hooks/useAdminReview';
import { db } from '../../lib/database';
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';

export default function AdminReviewPage() {
  const { user } = useAuth();
  const { pendingSubmissions, isLoading, approve, reject, refresh } = useAdminReview();
  const [tab, setTab] = useState<'shops' | 'corrections'>('shops');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingCorrections, setPendingCorrections] = useState<any[]>([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionActionLoading, setCorrectionActionLoading] = useState<string | null>(null);

  const fetchCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    const { data, error } = await db.directory.getPendingTypeSuggestions();
    if (!error) setPendingCorrections(data || []);
    setCorrectionsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'corrections') fetchCorrections();
  }, [tab, fetchCorrections]);

  useEffect(() => {
    fetchCorrections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleApproveCorrection = async (id: string) => {
    if (!user) return;
    setCorrectionActionLoading(id);
    await db.directory.approveTypeSuggestion(id, user.id);
    setPendingCorrections((prev) => prev.filter((c) => c.id !== id));
    setCorrectionActionLoading(null);
  };

  const handleRejectCorrection = async (id: string) => {
    if (!user) return;
    setCorrectionActionLoading(id);
    await db.directory.rejectTypeSuggestion(id, user.id);
    setPendingCorrections((prev) => prev.filter((c) => c.id !== id));
    setCorrectionActionLoading(null);
  };

  const typeLabel = (types: string[]) => {
    if (types.includes('repair') && types.includes('recycle')) return 'Repair & Recycle';
    if (types.includes('repair')) return '🔧 Repair';
    return '♻️ Recycle';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">Review Queue</h1>
        <button
          onClick={() => { refresh(); fetchCorrections(); }}
          className="px-3 py-1.5 text-sm border border-ink/20 rounded-md text-ink hover:bg-canvas"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-divider">
        <button
          onClick={() => setTab('shops')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'shops'
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Shop submissions ({pendingSubmissions.length})
        </button>
        <button
          onClick={() => setTab('corrections')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'corrections'
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Type corrections ({pendingCorrections.length})
        </button>
      </div>

      {actionError && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {actionError}
        </div>
      )}

      {/* Shop submissions tab */}
      {tab === 'shops' && (
        <>
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
                <div key={sub.id} className="bg-surface border border-ink/10 rounded-lg p-5">
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
                        <span>by User {sub.submitted_by?.slice(0, 8)}…</span>
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
        </>
      )}

      {/* Type corrections tab */}
      {tab === 'corrections' && (
        <>
          {correctionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : pendingCorrections.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted" />
              <p className="text-sm text-muted">No pending type corrections.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCorrections.map((c) => (
                <div key={c.id} className="bg-surface border border-ink/10 rounded-lg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm">
                        Geoapify place: <span className="font-mono text-xs text-muted">{c.geoapify_place_id}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="px-2 py-0.5 bg-ink/5 rounded text-xs">{typeLabel(c.original_types)}</span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                          {typeLabel(c.suggested_types)}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Submitted {new Date(c.created_at).toLocaleDateString()} by User {c.submitted_by?.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRejectCorrection(c.id)}
                        disabled={correctionActionLoading === c.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleApproveCorrection(c.id)}
                        disabled={correctionActionLoading === c.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                        title="Approve"
                      >
                        {correctionActionLoading === c.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
