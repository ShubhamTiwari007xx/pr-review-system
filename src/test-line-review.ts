import { validateReview } from "./validate-review";

async function main() {
  const file = "auth.js";

  const changedLines = [
  {
    line: 11,
    code: "const password = req.body.password;",
  },
  {
    line: 12,
    code: "const user = createUser(password);",
  },
];;

  const prompt = `
You are a strict senior code reviewer.

Review ONLY the changed lines provided below.

Do not review code outside these lines.
Do not invent issues that are not supported by the code.

For every real issue, return:
- file
- line
- severity
- description
- suggestion

Severity must be exactly according to the following definitions reduce hallucinations and ensure that severity is one use extremely carefully. The severity must be one of:
"low", "medium", or "high".

Return ONLY valid JSON.
Only report an issue when the provided code gives
sufficient evidence for the claim.

Do not assume that:
- a database query exists
- user input reaches a database
- a value is stored
- a function performs a specific operation
- another part of the application behaves a certain way

If the available context is insufficient to establish a problem,
do not report the issue.

Use exactly this structure:

{
  "issues": [
    {
      "file": "string",
      "line": 0,
      "severity": "low | medium | high",
      "description": "string",
      "suggestion": "string"
    }
  ]
}

File:
${file}

Changed lines:
${changedLines.map((item) => `${item.line}: ${item.code}`).join("\n")}
`;

  const response = await fetch(
    "http://localhost:11434/api/generate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5-coder:1.5b",
        prompt,
        format: "json",
        stream: false,
           options: {
        temperature: 0,
      },
      }),
    }
  );

  const data = await response.json();
  const review = JSON.parse(data.response);

   validateReview(review, [
  {
    file: "auth.js",
    changedLines: [11, 12],
  },
]);

console.log("✅ AI review passed validation!");
console.log(review);

  console.log(data.response);
}

main();