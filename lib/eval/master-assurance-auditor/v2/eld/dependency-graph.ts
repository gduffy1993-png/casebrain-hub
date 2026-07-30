/**
 * Source → fact → conclusion → sentence dependency graph helpers.
 * Pure calculation over synthetic graphs. Not a live CaseBrain adapter.
 */

import type {
  EldConclusionNode,
  EldDependencyEdge,
  EldDependencyGraph,
  EldFactNode,
  EldGraphNode,
  EldSentenceNode,
  EldSourceNode,
  EldSyntheticId,
} from "./types";
import { ELD_DEPENDENCY_GRAPH_SCHEMA } from "./types";

export function isSyntheticEldId(id: string): id is EldSyntheticId {
  return id.startsWith("syn-eld-");
}

export function assertSyntheticOnly(ids: string[]): void {
  for (const id of ids) {
    if (!isSyntheticEldId(id)) {
      throw new Error(
        `ELD foundation rejects non-synthetic id "${id}". Controlled synthetic version pairs only.`,
      );
    }
  }
}

export function indexNodes(graph: EldDependencyGraph): Map<string, EldGraphNode> {
  return new Map(graph.nodes.map((n) => [n.nodeId, n]));
}

export function outgoing(graph: EldDependencyGraph, fromId: string): EldDependencyEdge[] {
  return graph.edges.filter((e) => e.fromId === fromId);
}

export function incoming(graph: EldDependencyGraph, toId: string): EldDependencyEdge[] {
  return graph.edges.filter((e) => e.toId === toId);
}

export function nodesOfKind<K extends EldGraphNode["kind"]>(
  graph: EldDependencyGraph,
  kind: K,
): Extract<EldGraphNode, { kind: K }>[] {
  return graph.nodes.filter((n): n is Extract<EldGraphNode, { kind: K }> => n.kind === kind);
}

/**
 * Walk source/fact change forward to dependent sentences via
 * source→fact→conclusion→sentence (and fact→conclusion→sentence).
 */
export function collectDependentSentenceIds(
  graph: EldDependencyGraph,
  changedNodeIds: readonly string[],
): EldSyntheticId[] {
  assertSyntheticOnly([...changedNodeIds, graph.graphId]);
  const byId = indexNodes(graph);
  const visited = new Set<string>();
  const frontier = [...changedNodeIds];
  const sentences = new Set<EldSyntheticId>();

  while (frontier.length > 0) {
    const cur = frontier.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const node = byId.get(cur);
    if (!node) continue;
    if (node.kind === "sentence") {
      sentences.add(node.nodeId);
      continue;
    }
    for (const e of outgoing(graph, cur)) {
      frontier.push(e.toId);
    }
  }

  return [...sentences].sort();
}

export function validateDependencyGraphShape(graph: EldDependencyGraph): string[] {
  const errors: string[] = [];
  if (graph.schemaVersion !== ELD_DEPENDENCY_GRAPH_SCHEMA) {
    errors.push(`unexpected schemaVersion: ${graph.schemaVersion}`);
  }
  if (!isSyntheticEldId(graph.graphId)) {
    errors.push(`graphId must be synthetic: ${graph.graphId}`);
  }

  const nodeIds = graph.nodes.map((n) => n.nodeId);
  const edgeIds = graph.edges.map((e) => e.edgeId);
  const dupNodes = nodeIds.filter((id, i) => nodeIds.indexOf(id) !== i);
  const dupEdges = edgeIds.filter((id, i) => edgeIds.indexOf(id) !== i);
  for (const id of [...new Set(dupNodes)]) errors.push(`duplicate node ID: ${id}`);
  for (const id of [...new Set(dupEdges)]) errors.push(`duplicate edge ID: ${id}`);

  const byId = indexNodes(graph);
  for (const n of graph.nodes) {
    if (!isSyntheticEldId(n.nodeId)) errors.push(`non-synthetic node: ${n.nodeId}`);
  }
  for (const e of graph.edges) {
    if (!isSyntheticEldId(e.edgeId)) errors.push(`non-synthetic edge: ${e.edgeId}`);
    if (!byId.has(e.fromId)) errors.push(`dangling fromId: ${e.fromId}`);
    if (!byId.has(e.toId)) errors.push(`dangling toId: ${e.toId}`);
    const from = byId.get(e.fromId);
    const to = byId.get(e.toId);
    if (!from || !to) continue;
    const ok =
      (e.kind === "source_to_fact" && from.kind === "source" && to.kind === "fact") ||
      (e.kind === "fact_to_conclusion" && from.kind === "fact" && to.kind === "conclusion") ||
      (e.kind === "conclusion_to_sentence" &&
        from.kind === "conclusion" &&
        to.kind === "sentence") ||
      (e.kind === "sentence_to_exit" && from.kind === "sentence" && to.kind === "exit_surface") ||
      (e.kind === "approval_to_exit" && from.kind === "approval" && to.kind === "exit_surface") ||
      (e.kind === "warning_to_sentence" && from.kind === "warning" && to.kind === "sentence");
    if (!ok) errors.push(`invalid dependency direction / kind mismatch: ${e.edgeId} (${e.kind})`);
  }

  // Cycle detection (directed)
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.nodeId, []);
  for (const e of graph.edges) {
    if (!adj.has(e.fromId)) adj.set(e.fromId, []);
    adj.get(e.fromId)!.push(e.toId);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const nxt of adj.get(id) ?? []) {
      if (dfs(nxt)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of adj.keys()) {
    if (dfs(id)) {
      errors.push(`cycle detected involving node: ${id}`);
      break;
    }
  }

  // Ownership: sentence nodes must carry byte-identity wording hash
  for (const n of graph.nodes) {
    if (n.kind === "sentence") {
      const hash =
        "wordingHash" in n
          ? (n as { wordingHash?: string }).wordingHash
          : "contentHash" in n
            ? (n as { contentHash?: string }).contentHash
            : undefined;
      if (!hash || !String(hash).trim()) {
        errors.push(`sentence missing content identity: ${n.nodeId}`);
      }
    }
  }

  return errors;
}

/**
 * Validate changed-node set against graph + before/after sentence identity consistency.
 */
export function validateChangedNodesAndSentenceIdentity(args: {
  graph: EldDependencyGraph;
  changedNodeIds: readonly string[];
  beforeSentenceHashes?: Record<string, string>;
  afterSentenceHashes?: Record<string, string>;
  unaffectedMustRemainIdentical?: boolean;
}): string[] {
  const errors = [...validateDependencyGraphShape(args.graph)];
  const byId = indexNodes(args.graph);
  for (const id of args.changedNodeIds) {
    if (!byId.has(id)) errors.push(`missing changed-node ID: ${id}`);
  }
  if (args.unaffectedMustRemainIdentical && args.beforeSentenceHashes && args.afterSentenceHashes) {
    const affected = new Set(collectDependentSentenceIds(args.graph, args.changedNodeIds));
    for (const [sid, beforeHash] of Object.entries(args.beforeSentenceHashes)) {
      if (affected.has(sid as EldSyntheticId)) continue;
      const afterHash = args.afterSentenceHashes[sid];
      if (afterHash == null) {
        errors.push(`inconsistent before/after sentence identity — missing after hash: ${sid}`);
      } else if (afterHash !== beforeHash) {
        errors.push(
          `inconsistent before/after sentence identity — unaffected sentence mutated: ${sid}`,
        );
      }
    }
  }
  return errors;
}

export function asSource(n: EldGraphNode): EldSourceNode | null {
  return n.kind === "source" ? n : null;
}
export function asFact(n: EldGraphNode): EldFactNode | null {
  return n.kind === "fact" ? n : null;
}
export function asConclusion(n: EldGraphNode): EldConclusionNode | null {
  return n.kind === "conclusion" ? n : null;
}
export function asSentence(n: EldGraphNode): EldSentenceNode | null {
  return n.kind === "sentence" ? n : null;
}
