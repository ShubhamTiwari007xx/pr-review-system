
import path from "path";

import { buildRepositoryGraph } from "./architecture/scanner";
import { generateArchitectureDiagram } from "./architecture/architecture-diagram";
import { findImpactedComponents } from "./architecture/impact";

const repositoryRoot = path.resolve(".");
const graph = buildRepositoryGraph(repositoryRoot);

const changedFiles = ["src/diff-parser.ts"];
const impactedFiles = findImpactedComponents(changedFiles, graph);

const diagram = generateArchitectureDiagram(
  graph,
  changedFiles,
  impactedFiles
);

console.log("Components:", graph.components.length);
console.log("Relationships:", graph.relationships.length);
console.log("Changed files:", changedFiles);
console.log("Impacted files:", impactedFiles);
console.log(diagram);
console.log(
  "Diagram has invalid file IDs:",
  /file\d+ --> file\d+/.test(diagram) &&
    [...diagram.matchAll(/file(\d+)/g)].some(
      (match) => Number(match[1]) >= 19
    )
);