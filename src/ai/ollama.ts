import type { ChangedFile } from "../diff-parser";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5-coder:1.5b";

export async function reviewWithOllama(
  changedFiles: ChangedFile[]
) {
  if (changedFiles.length === 0) {
    throw new Error("No changed files found");
  }

  const changedCode = changedFiles
    .map(
      (file) => `
File: ${file.file}

${file.changedLines
  .map(
    (line) =>
      `Line ${line.line}: ${line.code}`
  )
  .join("\n")}
`
    )
    .join("\n");

  const prompt = `
You are a strict senior code reviewer.

Your job is to review ONLY the changed code provided below.

IMPORTANT RULES:

1. Review ONLY the code shown below.
2. Do NOT invent surrounding code.
3. Do NOT assume behavior that is not visible.
4. Every reported issue MUST include:
   - the exact file name
   - the exact changed line number
   - severity
   - description
   - suggestion
5. The file name MUST exactly match one of the provided files.
6. The line number MUST exactly match one of the provided changed lines.
7. Do NOT report issues on unchanged lines.
8. If there is not enough evidence to identify a real problem, do not report it.
9. If there are no meaningful issues, return an empty issues array.
10. Do NOT include a summary.
11. Do NOT include any fields other than the ones specified below.
12. Return ONLY valid JSON.
13. Do NOT use Markdown.
14. Do NOT use code fences.

The required JSON format is EXACTLY:

{
  "issues": [
    {
      "file": "string",
      "line": 0,
      "severity": "low",
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}

Changed code:

${changedCode}
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      format: "json",
      stream: false,
      options: {
        temperature: 0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  let review;

  try {
    review = JSON.parse(data.response);
  } catch {
    console.log("Raw Ollama response:");
    console.log(data.response);

    throw new Error("Ollama returned invalid JSON");
  }

  if (!review || !Array.isArray(review.issues)) {
    throw new Error(
      "Invalid AI review format: issues array missing"
    );
  }

  return review;
}