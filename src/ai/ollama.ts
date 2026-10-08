import type { ChangedFile } from "../diff-parser";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5-coder:3b";
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

Your job is to review ONLY the changed code and the provided surrounding context.

IMPORTANT RULES:

1. Review ONLY the changed lines.
2. You MAY use the surrounding context to understand the meaning of the changed code.
3. Do NOT invent code, variables, functions, types, behavior, or dependencies that are not visible in the provided context.
4. Understand the programming language and its syntax before reporting an issue.
5. Report an issue ONLY when there is concrete evidence that the changed code is incorrect, unsafe, or likely to cause a real bug.
6. Do NOT report personal style preferences as bugs.
7. Do NOT report harmless refactoring or valid language features as issues.
8. Do NOT report an issue merely because the code could be written differently.
9. Verify that your suggested fix actually addresses the reported problem.
10. If there is not enough evidence to identify a real problem, do not report it.
11. Every reported issue MUST include:
    - the exact file name
    - the exact changed line number
    - severity
    - description
    - suggestion
12. The file name MUST exactly match one of the provided files.
13. The line number MUST exactly match one of the provided changed lines.
14. Do NOT report issues on unchanged lines.
15. If there are no meaningful issues, return an empty issues array.
16. Do NOT include a summary.
17. Do NOT include any fields other than the ones specified below.
18. Return ONLY valid JSON.
19. Do NOT use Markdown.
20. Do NOT use code fences.
21. Before reporting a syntax or language-semantics issue, verify that the construct is actually invalid according to the rules of the programming language.
22. Do NOT report issues that are purely stylistic, redundant, verbose, or simplifiable when the existing code is valid and functionally correct.
23. Do NOT report "could be simplified", "could be cleaner", or "could be shorter" suggestions as issues.
24. A valid alternative implementation is NOT a bug.
25. Only report a low-severity issue if the existing code has a concrete negative effect on correctness, safety, performance, maintainability, or reliability.

SCOPE AND DECLARATION RULES:

Do not assume that every identifier is a variable.

Before reporting an unused variable:
- Confirm that the changed line actually declares a variable, constant, parameter, or local binding.
- Do not treat object properties, interface properties, type properties, function names, class members, or property names as unused variables.
- Only report an unused variable when the surrounding context clearly shows that a variable is declared and never referenced.
- Do not report an issue based only on the name of an identifier.


OUTPUT SCHEMA VS SOURCE CODE:

The JSON format described in this prompt defines the format of YOUR REVIEW RESPONSE.

It does NOT define the syntax, types, fields, properties, or structure allowed in the SOURCE CODE being reviewed.

Never apply the review JSON schema to the source code.

For example, if the source code contains:

type AIReviewIssue = {
  file: string;
  line: number;
  severity: string;
  description: string;
  suggestion: string;
};

the suggestion property is valid source code and MUST NOT be reported as invalid merely because suggestion is also a field in the review JSON schema.

Judge the source code according to its actual programming language, not according to the JSON response format.
CHANGED-LINE CAUSALITY:

The reported problem must be caused by the changed line itself.

Do not report an issue simply because something elsewhere in the surrounding context looks unused, suspicious, or improvable.

If removing or changing the changed line would not address the reported problem, do not report it.
IMPORTANT REVIEW STANDARD:
Before reporting an issue, ask yourself:

Do not report a problem simply because a source-code field has the same name as a field in the review response schema.

The review response schema must never be used as evidence that source code is invalid.
- Is this actually invalid or incorrect for the programming language?
- Can I prove the problem from the provided code?
- Am I confusing a valid language feature with a bug?
- Does the surrounding context change my interpretation?
- Is my suggested fix actually correct?
- Would this issue cause a real bug, error, or incorrect behavior?
-Before reporting a syntax or language-semantics issue, verify that the construct is actually invalid according to the rules of the programming language.
LANGUAGE SEMANTICS:

For JavaScript and TypeScript, remember these valid language features:

- Object shorthand is valid JavaScript and TypeScript.
- { id } is exactly equivalent to { id: id } when a variable named id exists.
- Do NOT report object shorthand as an issue.
- A property written as { name } is not a string. It is an object property shorthand.
- const x = { id } is valid JavaScript and TypeScript.
- const x = { id: id } and const x = { id } are equivalent when id is in scope.

If the answer is uncertain, DO NOT report the issue.

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

Code under review:

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