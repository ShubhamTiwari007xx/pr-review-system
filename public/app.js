// ---------- NEXUS Dashboard ----------

// Sample data for the first frontend version.
// We will replace this with real backend API data later.
const architectureData = {
  components: [
    "server.ts",
    "queue.ts",
    "worker.ts",
    "diff-parser.ts",
    "code-context.ts",
    "scanner.ts",
    "impact.ts",
    "architecture-diagram.ts",
    "ollama.ts",
    "github.ts",
    "db.ts",
  ],

  relationships: [
    ["server.ts", "queue.ts"],
    ["server.ts", "db.ts"],
    ["worker.ts", "queue.ts"],
    ["worker.ts", "diff-parser.ts"],
    ["worker.ts", "code-context.ts"],
    ["worker.ts", "scanner.ts"],
    ["worker.ts", "impact.ts"],
    ["worker.ts", "ollama.ts"],
    ["worker.ts", "github.ts"],
    ["scanner.ts", "impact.ts"],
    ["scanner.ts", "architecture-diagram.ts"],
    ["impact.ts", "architecture-diagram.ts"],
    ["code-context.ts", "diff-parser.ts"],
  ],

  changedFiles: ["diff-parser.ts"],

  impactedFiles: [
    "diff-parser.ts",
    "worker.ts",
    "code-context.ts",
  ],
};

// ---------- Mermaid configuration ----------

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
  flowchart: {
    curve: "basis",
    htmlLabels: true,
    padding: 15,
  },
  themeVariables: {
    background: "#121620",
    primaryColor: "#191e2b",
    primaryTextColor: "#edf0f7",
    primaryBorderColor: "#45405f",
    lineColor: "#777f95",
    secondaryColor: "#25213d",
    tertiaryColor: "#121620",
    fontFamily: "Inter, system-ui, sans-serif",
  },
});

// ---------- DOM elements ----------

const diagramContainer = document.getElementById("diagram-container");
const refreshButton = document.getElementById("refresh-button");

const componentCount = document.getElementById("component-count");
const relationshipCount = document.getElementById("relationship-count");
const changedCount = document.getElementById("changed-count");
const impactedCount = document.getElementById("impacted-count");

// ---------- Build diagram ----------

function buildMermaidDiagram(data) {
  const lines = ["flowchart LR"];

  const changed = new Set(data.changedFiles);
  const impacted = new Set(data.impactedFiles);

  // Assign stable Mermaid-safe IDs to component names.
  const nodeIds = new Map(
    data.components.map((file, index) => [file, `node${index}`]),
  );

  for (const file of data.components) {
    const nodeId = nodeIds.get(file);

    // Escape quotes in labels before adding them to Mermaid syntax.
    const label = file.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

    lines.push(`  ${nodeId}["${label}"]`);
  }

  // Draw dependencies only when both components exist.
  for (const [from, to] of data.relationships) {
    if (nodeIds.has(from) && nodeIds.has(to)) {
      lines.push(`  ${nodeIds.get(from)} --> ${nodeIds.get(to)}`);
    }
  }

  // Highlight changed files and impacted components.
  for (const file of changed) {
    if (nodeIds.has(file)) {
      lines.push(`  style ${nodeIds.get(file)} fill:#512b35,stroke:#ff727e,stroke-width:3px,color:#ffffff`);
    }
  }

  for (const file of impacted) {
    if (nodeIds.has(file) && !changed.has(file)) {
      lines.push(`  style ${nodeIds.get(file)} fill:#493b22,stroke:#f6c76a,stroke-width:2px,color:#ffffff`);
    }
  }

  return lines.join("\n");
}

// ---------- Update statistics ----------

function updateStatistics(data) {
  componentCount.textContent = data.components.length;
  relationshipCount.textContent = data.relationships.length;
  changedCount.textContent = data.changedFiles.length;
  impactedCount.textContent = data.impactedFiles.length;
}

// ---------- Render diagram ----------

async function renderArchitecture() {
  refreshButton.disabled = true;
  refreshButton.textContent = "Rendering...";

  diagramContainer.innerHTML = `
    <div class="loading-state">
      <div class="loader"></div>
      <p>Rendering architecture diagram...</p>
    </div>
  `;

  try {
    const diagramDefinition = buildMermaidDiagram(architectureData);

    // Generate a unique ID for every render.
    const renderId = `nexus-diagram-${Date.now()}`;

    const { svg, bindFunctions } = await mermaid.render(
      renderId,
      diagramDefinition,
    );

    diagramContainer.innerHTML = svg;

    if (bindFunctions) {
      bindFunctions(diagramContainer);
    }

    updateStatistics(architectureData);
  } catch (error) {
    console.error("Failed to render architecture diagram:", error);

    diagramContainer.innerHTML = `
      <div class="empty-state">
        <h4>Unable to render diagram</h4>
        <p>Check the browser console for details, then try refreshing.</p>
      </div>
    `;
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Refresh diagram";
  }
}

// ---------- Events ----------

refreshButton.addEventListener("click", renderArchitecture);

// ---------- Initialize dashboard ----------

renderArchitecture();

