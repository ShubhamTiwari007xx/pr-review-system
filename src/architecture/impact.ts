import type { RepositoryGraph } from "./types";

export function findImpactedComponents(
  changedFiles: string[],
  graph: RepositoryGraph
): string[] {
  const impacted = new Set<string>();
  const queue = [...changedFiles];

  while (queue.length > 0) {
    const currentFile = queue.shift()!;

    if (impacted.has(currentFile)) {
      continue;
    }

    impacted.add(currentFile);

    for (const relationship of graph.relationships) {
      if (relationship.to === currentFile) {
        const dependentFile = relationship.from;
         
        if (!impacted.has(dependentFile)) {
          queue.push(dependentFile);
        }
      }
    }
  }

  return [...impacted];
}