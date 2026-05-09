/**
 * Inline rich-text renderer: converts **bold** and *italic* markers to
 * <strong> / <em> elements. Returns a plain string when no markers are found
 * (fast path). Safe to call on arbitrary user text — unmatched markers are
 * left as-is by the regex.
 */
export function renderInline(text: string): React.ReactNode {
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let m: RegExpExecArray | null;
  let last = 0;
  const parts: React.ReactNode[] = [];

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={m.index}>{m[1]}</strong>);
    } else {
      parts.push(<em key={m.index}>{m[2]}</em>);
    }
    last = m.index + m[0].length;
  }

  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
