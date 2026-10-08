import { buildRepositoryGraph } from "./architecture/scanner";

const graph = buildRepositoryGraph("./src");

console.log(JSON.stringify(graph, null, 2));