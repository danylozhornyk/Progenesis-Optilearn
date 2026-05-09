'use client';

import { useT } from '@/lib/i18n';
import { GraphBlock } from './types';
import GraphRenderer from '@/components/GraphRenderer';
import type { GraphData } from '@/components/GraphRenderer';

/**
 * Read-only graph preview — delegates to GraphRenderer so the preview panel
 * matches the live lesson page exactly.
 */
export function GraphSvg({ block }: { block: GraphBlock }) {
  const { t } = useT();
  const vertices = block.vertices ?? [];
  const edges    = block.edges    ?? [];
  const directed = block.directed ?? false;

  if (!vertices.length) {
    return <p className="text-xs italic text-muted-foreground">{t('admin.lessonEditor.noVertices')}</p>;
  }

  const graphData: GraphData = {
    graphType: directed ? 'DIRECTED' : 'UNDIRECTED',
    vertices,
    edges,
  };

  return (
    <div className="space-y-1">
      {block.title && (
        <p className="text-xs font-medium text-center text-foreground">{block.title}</p>
      )}
      <GraphRenderer graph={graphData} height={220} />
    </div>
  );
}
