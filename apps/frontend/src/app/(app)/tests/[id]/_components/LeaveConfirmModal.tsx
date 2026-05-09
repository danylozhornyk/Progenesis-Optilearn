'use client';

import { useT } from '@/lib/i18n';

/**
 * Confirmation dialog shown when the user tries to navigate away mid-test.
 * Rendered as a centered modal with a backdrop.
 */
export function LeaveConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  if (!isOpen) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        aria-describedby="leave-desc"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background border border-border shadow-2xl p-6 space-y-4"
      >
        <div className="space-y-1.5">
          <h2 id="leave-title" className="text-sm font-semibold text-foreground">
            {t('test.leaveTitle')}
          </h2>
          <p id="leave-desc" className="text-sm text-muted-foreground">
            {t('test.leaveBody')}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            {t('test.leaveCancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
          >
            {t('test.leaveConfirm')}
          </button>
        </div>
      </div>
    </>
  );
}
