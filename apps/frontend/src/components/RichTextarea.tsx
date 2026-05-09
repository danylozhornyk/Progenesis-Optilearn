'use client';

import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Textarea with a minimal **B** / *I* formatting toolbar.
 *
 * Clicking B wraps the current selection (or inserts markers at cursor) with
 * `**...**`; clicking I wraps with `*...*`. Uses onMouseDown + preventDefault
 * so the textarea never loses its selection when the button is clicked.
 */
export function RichTextarea({ value, onChange, rows = 4, placeholder, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(open: string, close: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const newValue = value.slice(0, s) + open + value.slice(s, e) + close + value.slice(e);
    onChange(newValue);
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      const cursor = e > s ? e + open.length : s + open.length;
      ref.current.setSelectionRange(
        e > s ? s + open.length : cursor,
        cursor,
      );
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); wrap('**', '**'); }}
          className="px-2 py-0.5 text-xs font-bold border border-border rounded hover:bg-muted transition-colors select-none"
          title="Bold — **text**"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); wrap('*', '*'); }}
          className="px-2 py-0.5 text-xs italic border border-border rounded hover:bg-muted transition-colors select-none"
          title="Italic — *text*"
        >
          I
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={className ?? 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[80px]'}
      />
    </div>
  );
}
