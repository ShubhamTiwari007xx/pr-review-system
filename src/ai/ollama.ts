const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5-coder:1.5b";

export async function reviewWithOllama(diff: string) {
  if (!diff.trim()) {
    throw new Error("Cannot review an empty diff");
  }

  const prompt = `
You are a strict senior code reviewer.

Review the following GitHub Pull Request diff.

IMPORTANT:
- Focus primarily on NEW code, represented by lines beginning with "+".
- Lines beginning with "-" represent removed code.
- Unchanged lines provide context.
- Identify real bugs, incorrect behavior, security problems, bad error handling, or important code-quality issues.
- Do not invent problems that are not supported by the diff.
- If there are no meaningful issues, return an empty issues array.
- Every suggestion must describe how to fix the actual problem.
- severity must be exactly one of: "low", "medium", "high".

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.

Use exactly this structure:

{
  "summary": "short explanation of the overall review",
  "issues": [
    {
      "severity": "low | medium | high",
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}

GitHub PR diff:

${diff}
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
    throw new Error("Ollama returned invalid JSON");
  }

  validateReview(review);

  return review;
}

function validateReview(review: any) {
  if (
    typeof review.summary !== "string" ||
    !Array.isArray(review.issues)
  ) {
    throw new Error("Invalid review format");
  }

  for (const issue of review.issues) {
    if (
      !["low", "medium", "high"].includes(issue.severity) ||
      typeof issue.description !== "string" ||
      typeof issue.suggestion !== "string"
    ) {
      throw new Error("Invalid issue format");
    }
  }
}
