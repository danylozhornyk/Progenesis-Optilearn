import { prisma } from '../db/prisma';
import { GraphType } from 'generated/prisma';

export function getGraphsByUser(userId: string) {
  return prisma.graph.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export function getTemplateGraphs() {
  return prisma.graph.findMany({
    where: { userId: null },
    orderBy: { createdAt: 'desc' },
  });
}

export function getGraphById(id: string) {
  return prisma.graph.findUnique({ where: { id } });
}

export function createGraph(data: {
  userId?: string;
  title?: string;
  graphType: GraphType;
  vertices?: object[];
  edges?: object[];
}) {
  const vertexCount = (data.vertices ?? []).length;
  const edgeCount = (data.edges ?? []).length;

  return prisma.graph.create({
    data: {
      ...data,
      vertices: data.vertices ?? [],
      edges: data.edges ?? [],
      vertexCount,
      edgeCount,
    },
  });
}

export function updateGraph(id: string, data: {
  title?: string;
  vertices?: object[];
  edges?: object[];
}) {
  const vertexCount = data.vertices?.length;
  const edgeCount = data.edges?.length;

  return prisma.graph.update({
    where: { id },
    data: {
      ...data,
      ...(vertexCount !== undefined && { vertexCount }),
      ...(edgeCount !== undefined && { edgeCount }),
    },
  });
}

export function deleteGraph(id: string) {
  return prisma.graph.delete({ where: { id } });
}
