import { useState, useEffect, useCallback } from 'react';
import { db, PendingSubmission } from '../lib/database';

interface UseAdminReviewReturn {
  pendingSubmissions: PendingSubmission[];
  isLoading: boolean;
  approve: (taskId: string, reviewerId: string) => Promise<string | null>;
  reject: (taskId: string, reviewerId: string, notes: string) => Promise<string | null>;
  refresh: () => void;
}

export function useAdminReview(): UseAdminReviewReturn {
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await db.directory.getPendingSubmissions();
    if (error) {
      console.error('Failed to fetch pending submissions:', error);
      setPendingSubmissions([]);
    } else {
      setPendingSubmissions(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approve = useCallback(async (taskId: string, reviewerId: string): Promise<string | null> => {
    const { error } = await db.directory.approveSubmission(taskId, reviewerId);
    if (error) {
      console.error('Failed to approve submission:', error);
      return error.message || 'Failed to approve';
    }
    setPendingSubmissions((prev) => prev.filter((s) => s.id !== taskId));
    return null;
  }, []);

  const reject = useCallback(async (taskId: string, reviewerId: string, notes: string): Promise<string | null> => {
    const { error } = await db.directory.rejectSubmission(taskId, reviewerId, notes);
    if (error) {
      console.error('Failed to reject submission:', error);
      return error.message || 'Failed to reject';
    }
    setPendingSubmissions((prev) => prev.filter((s) => s.id !== taskId));
    return null;
  }, []);

  return {
    pendingSubmissions,
    isLoading,
    approve,
    reject,
    refresh: fetchPending,
  };
}
