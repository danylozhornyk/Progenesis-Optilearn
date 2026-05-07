import { ContentBlock, BlockType } from './types';

export const BLOCK_TYPES: BlockType[] = ['text', 'latex', 'image', 'chart', 'graph'];

/** Build a fresh block of the given type with sensible starter content. */
export function defaultBlock(type: BlockType): ContentBlock {
  switch (type) {
    case 'text':  return { type: 'text', value: '' };
    case 'latex': return { type: 'latex', value: '' };
    case 'image': return { type: 'image', url: '', caption: '' };
    case 'chart': return {
      type: 'chart', chartType: 'bar', title: '', color: '#6366f1',
      labels: ['A', 'B', 'C', 'D'], data: [4, 7, 3, 6],
    };
    case 'graph': return {
      // graphId is filled in asynchronously by the parent (POST /graphs)
      // before the block is committed to state. We use an empty string as
      // the sentinel and never render a graph block whose id is empty.
      type: 'graph', graphId: '', title: '', directed: false,
      vertices: [
        { id: 'v1', label: '1', x: 80,  y: 70  },
        { id: 'v2', label: '2', x: 210, y: 45  },
        { id: 'v3', label: '3', x: 270, y: 155 },
        { id: 'v4', label: '4', x: 110, y: 175 },
      ],
      edges: [
        { source: 'v1', target: 'v2' },
        { source: 'v2', target: 'v3' },
        { source: 'v3', target: 'v4' },
        { source: 'v4', target: 'v1' },
      ],
    };
  }
}

/** Default starter payload sent when creating a new Graph row from the editor. */
export const DEFAULT_GRAPH_PAYLOAD = {
  graphType: 'UNDIRECTED' as const,
  title: '',
  titleUk: '',
  vertices: [
    { id: 'v1', label: '1', x: 80,  y: 70  },
    { id: 'v2', label: '2', x: 210, y: 45  },
    { id: 'v3', label: '3', x: 270, y: 155 },
    { id: 'v4', label: '4', x: 110, y: 175 },
  ],
  edges: [
    { source: 'v1', target: 'v2' },
    { source: 'v2', target: 'v3' },
    { source: 'v3', target: 'v4' },
    { source: 'v4', target: 'v1' },
  ],
};
