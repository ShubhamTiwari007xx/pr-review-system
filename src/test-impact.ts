import { buildRepositoryGraph } from "./architecture/scanner";
import { findImpactedComponents } from "./architecture/impact";

const graph = buildRepositoryGraph("./src");

const changedFiles = [
  "diff-parser.ts",
];

const impacted = findImpactedComponents(
  changedFiles,
  graph
);


console.log("Changed files:");
console.log(changedFiles);

console.log("\nImpacted components:");
console.log(impacted);