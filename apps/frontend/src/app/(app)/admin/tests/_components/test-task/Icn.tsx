'use client';

/** Tiny icon-button used in the task card toolbar (move/duplicate/delete). */
export function Icn({ onClick, disabled, className = '', title, children }: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className={`p-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
