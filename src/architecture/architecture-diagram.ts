
import type { RepositoryGraph } from "./types";

function isArchitectureFile(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  const parts = normalized.toLowerCase().split("/");
  const filename = parts[parts.length - 1];

  if (
    parts.includes("migrations") ||
    parts.includes("test") ||
    parts.includes("tests") ||
    parts.includes("snapshots")
  ) {
    return false;
  }

  if (
    /^test[-.]/.test(filename) ||
    /\.(test|spec)\.[^.]+$/.test(filename) ||
    filename.endsWith(".d.ts")
  ) {
    return false;
  }

  return true;
}

export function generateArchitectureDiagram(
  graph: RepositoryGraph,
  changedFiles: string[] = [],
  impactedFiles: string[] = []
): string {
  const visibleComponents = graph.components.filter(
    (component) => isArchitectureFile(component.file)
  );

  const visibleFiles = new Set(
    visibleComponents.map((component) => component.file)
  );

  const changed = new Set(changedFiles);
  const impacted = new Set(impactedFiles);

  const lines: string[] = ["flowchart LR"];
  const fileIds = new Map<string, string>();

  visibleComponents.forEach((component, index) => {
    fileIds.set(component.file, `file${index}`);
  });

  for (const component of visibleComponents) {
    const file = component.file;
    const id = fileIds.get(file)!;
    const label = file.replace(/"/g, "#quot;");

    if (changed.has(file)) {
      lines.push(`  ${id}["${label}"]`);
      lines.push(`  style ${id} fill:#fca5a5,stroke:#991b1b,stroke-width:2px{}`);
    } else if (impacted.has(file)) {
      lines.push(`  ${id}["${label}"]`);
      lines.push(`style ${id} fill:#fef3c7,stroke:#78350f,stroke-width:2px{}`);
    } else {
      lines.push(`  ${id}["${label}"]`);
    }
  }

  for (const relationship of graph.relationships) {
    if (
      !visibleFiles.has(relationship.from) ||
      !visibleFiles.has(relationship.to)
    ) {
      continue;
    }

    const fromId = fileIds.get(relationship.from);
    const toId = fileIds.get(relationship.to);

    if (fromId && toId) {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join("\n");
}