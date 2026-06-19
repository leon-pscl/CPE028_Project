import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Station, StationType } from '../../types/station';
import { db } from '../../lib/database';

interface SuggestTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  station: Station;
  userId: string;
  userRole?: string;
}

export default function SuggestTypeModal({
  isOpen,
  onClose,
  onSuccess,
  station,
  userId,
  userRole,
}: SuggestTypeModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<StationType[]>([...station.types]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleType = (t: StationType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) {
      setError('Select at least one service type.');
      return;
    }

    const same =
      station.types.length === selectedTypes.length &&
      station.types.every((t) => selectedTypes.includes(t));
    if (same) {
      setError('No changes — the types are the same as the current classification.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: submitError } = await db.directory.submitTypeSuggestion(
      station.geoapify_place_id!,
      station.types,
      selectedTypes,
      userId,
      userRole,
    );

    setIsSubmitting(false);

    if (submitError) {
      setError(submitError.message || 'Failed to submit correction.');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/50">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-divider">
          <h2 className="text-base font-bold text-ink">Suggest type correction</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink rounded" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted">
            <strong className="text-ink">{station.name}</strong> is currently classified as{' '}
            <strong>{station.types.includes('repair') && station.types.includes('recycle')
              ? 'Repair & Recycle'
              : station.types.includes('repair') ? 'Repair' : 'Recycle'}</strong>.
            Suggest the correct type(s):
          </p>

          {error && (
            <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <label className="flex items-center gap-2 px-4 py-2 border border-ink/20 rounded-md cursor-pointer has-[:checked]:bg-ink has-[:checked]:text-surface">
              <input
                type="checkbox"
                checked={selectedTypes.includes('repair')}
                onChange={() => toggleType('repair')}
                className="sr-only"
              />
              <span>🔧 Repair</span>
            </label>
            <label className="flex items-center gap-2 px-4 py-2 border border-ink/20 rounded-md cursor-pointer has-[:checked]:bg-ink has-[:checked]:text-surface">
              <input
                type="checkbox"
                checked={selectedTypes.includes('recycle')}
                onChange={() => toggleType('recycle')}
                className="sr-only"
              />
              <span>♻️ Recycle</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-ink/20 rounded-md text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedTypes.length === 0}
              className="flex-1 px-3 py-2 text-sm bg-ink text-surface rounded-md font-medium hover:bg-ink/80 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
