import { parseDiff } from "./diff-parser";
import { validateReview } from "./ai/validate.review";

const diff = `
diff --git a/math.js b/math.js
index 1234567..abcdefg 100644
--- a/math.js
+++ b/math.js
@@ -1,3 +1,3 @@
 function add(a, b) {
-  return a + b;
+  return a - b;
 }
`;

const changedFiles = parseDiff(diff);

console.log("📦 Parsed changed lines:", JSON.stringify(changedFiles, null, 2));


async function reviewChangedCode() {
  const prompt = `
You are a strict senior code reviewer.

Review ONLY the changed lines provided below.

IMPORTANT RULES:
- Only review the code shown in the changed lines.
- Do not invent surrounding code or application behavior.
- Do not assume how functions behave unless their behavior is visible.
- Do not report an issue unless there is enough evidence in the provided code.
- The file and line number in your response MUST exactly match one of the provided changed lines.
- If there are no meaningful issues, return an empty issues array.

Return ONLY valid JSON.

Use exactly this structure:

{
  "issues": [
    {
      "file": "string",
      "line": 0,
      "severity": "low | medium | high",
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}

Changed code:

${changedFiles
  .map(
    (file) => `
File: ${file.file}

${file.changedLines
  .map((changedLine) => `Line ${changedLine.line}: ${changedLine.code}`)
  .join("\n")}
`,
  )
  .join("\n")}
`;

  console.log("\n🤖 Sending structured code to Ollama...\n");

  const response = await fetch("http://localhost:11434/api/generate", {
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
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  console.log("\n🤖 Raw AI response:\n");
  console.log(data.response);
  const review = JSON.parse(data.response);

  console.log("\n corrupting Parsed AI review:\n");
  console.log(JSON.stringify(review, null, 2));

  const validation = validateReview(review, changedFiles);

  console.log("\n🛡️ Validation result:\n");

  console.log("✅ Valid issues:", validation.validIssues.length);
  console.log("❌ Rejected issues:", validation.rejectedIssues.length);

  if (validation.validIssues.length > 0) {
    console.log("\n✅ Accepted issues:");
    console.log(JSON.stringify(validation.validIssues, null, 2));
  }

  if (validation.rejectedIssues.length > 0) {
    console.log("\n❌ Rejected issues:");

    for (const rejected of validation.rejectedIssues) {
      console.log(`- ${rejected.reason}`);
    }
  }
}

reviewChangedCode();
